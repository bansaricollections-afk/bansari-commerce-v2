import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import {
  getCategories,
  getSubcategories,
  getCollections,
  getTags,
  getSizes,
  getSizeCharts,
  getAttributeOptions,
} from '@/services/catalog.service';

const log = createLogger({ service: 'admin.catalog' });

/**
 * GET /api/admin/catalog
 *
 * Returns every master dataset required by the Product Management wizard
 * in a single response. All 14 queries fire in parallel via Promise.all.
 *
 * Response shape:
 * {
 *   success: true,
 *   requestId: string,
 *   categories:    { id, name, slug, displayOrder, active }[],
 *   subcategories: { id, categoryId, name, slug, displayOrder, active }[],
 *   collections:   { id, name, slug, displayOrder, active }[],
 *   tags:          { id, name, slug }[],
 *   sizeMaster:    { id, name, sortOrder, active }[],
 *   sizeCharts:    { id, name, description }[],
 *   attrs: {
 *     fabric:   { id, name, slug, displayOrder, active }[],
 *     color:    { id, name, slug, displayOrder, active, hex? }[],
 *     occasion: { id, name, slug, displayOrder, active }[],
 *     pattern:  { id, name, slug, displayOrder, active }[],
 *     fit:      { id, name, slug, displayOrder, active }[],
 *     sleeve:   { id, name, slug, displayOrder, active }[],
 *     neck:     { id, name, slug, displayOrder, active }[],
 *     work:     { id, name, slug, displayOrder, active }[],
 *     length:   { id, name, slug, displayOrder, active }[],
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Fire all 14 queries in parallel — zero N+1, single round-trip batch.
    const [
      categories,
      subcategories,
      collections,
      tags,
      sizeMaster,
      sizeCharts,
      attrFabric,
      attrColor,
      attrOccasion,
      attrPattern,
      attrFit,
      attrSleeve,
      attrNeck,
      attrWork,
      attrLength,
    ] = await Promise.all([
      getCategories(false),          // include inactive so admin can see all
      getSubcategories(undefined, false),
      getCollections(false),
      getTags(),
      getSizes(false),
      getSizeCharts(),
      getAttributeOptions('attr_fabric',   false),
      getAttributeOptions('attr_color',    false),
      getAttributeOptions('attr_occasion', false),
      getAttributeOptions('attr_pattern',  false),
      getAttributeOptions('attr_fit',      false),
      getAttributeOptions('attr_sleeve',   false),
      getAttributeOptions('attr_neck',     false),
      getAttributeOptions('attr_work',     false),
      getAttributeOptions('attr_length',   false),
    ]);

    // Slim the payload — strip unused fields that are not needed by the UI.
    const payload = {
      categories: categories.map((c) => ({
        id:           c.id,
        name:         c.name,
        slug:         c.slug,
        displayOrder: c.displayOrder,
        active:       c.active,
      })),

      subcategories: subcategories.map((s) => ({
        id:           s.id,
        categoryId:   s.categoryId,
        name:         s.name,
        slug:         s.slug,
        displayOrder: s.displayOrder,
        active:       s.active,
      })),

      collections: collections.map((c) => ({
        id:           c.id,
        name:         c.name,
        slug:         c.slug,
        displayOrder: c.displayOrder,
        active:       c.active,
      })),

      tags: tags.map((t) => ({
        id:   t.id,
        name: t.name,
        slug: t.slug,
      })),

      sizeMaster: sizeMaster.map((s) => ({
        id:        s.id,
        name:      s.name,
        sortOrder: s.sortOrder,
        active:    s.active,
      })),

      // Only expose id, name, description for size chart selector
      sizeCharts: sizeCharts.map((sc) => ({
        id:          sc.id,
        name:        sc.name,
        description: sc.description,
      })),

      attrs: {
        fabric:   attrFabric.map((a)   => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        color:    attrColor.map((a)    => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active, hex: a.hex })),
        occasion: attrOccasion.map((a) => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        pattern:  attrPattern.map((a)  => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        fit:      attrFit.map((a)      => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        sleeve:   attrSleeve.map((a)   => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        neck:     attrNeck.map((a)     => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        work:     attrWork.map((a)     => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
        length:   attrLength.map((a)   => ({ id: a.id, name: a.name, slug: a.slug, displayOrder: a.displayOrder, active: a.active })),
      },
    };

    log.info('admin.catalog.get.ok', {
      requestId,
      counts: {
        categories:    payload.categories.length,
        subcategories: payload.subcategories.length,
        collections:   payload.collections.length,
        tags:          payload.tags.length,
        sizeMaster:    payload.sizeMaster.length,
        sizeCharts:    payload.sizeCharts.length,
        attrs: {
          fabric:   payload.attrs.fabric.length,
          color:    payload.attrs.color.length,
          occasion: payload.attrs.occasion.length,
          pattern:  payload.attrs.pattern.length,
          fit:      payload.attrs.fit.length,
          sleeve:   payload.attrs.sleeve.length,
          neck:     payload.attrs.neck.length,
          work:     payload.attrs.work.length,
          length:   payload.attrs.length.length,
        },
      },
    });

    return NextResponse.json({ success: true, requestId, ...payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.catalog.get.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
