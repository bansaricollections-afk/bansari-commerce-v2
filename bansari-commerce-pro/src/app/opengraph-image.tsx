import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

/*
 * Node runtime rather than edge: the logo is read straight off disk with fs
 * instead of fetched over the network, so generating the card never depends on
 * the site being reachable and cannot fail midway through a social crawl.
 */
export const runtime = 'nodejs';
export const alt = 'Bansari Collections — Indian Ethnic Wear';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const logo = await readFile(
    path.join(process.cwd(), 'public', 'logo-full.png')
  );
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          /*
           * Pure black, matching the logo artwork's own background. On the
           * brand plum (--bc-surface-dark #1A0F16) the square would show a
           * visible seam around the mark; matching it makes the artwork read
           * as part of the canvas.
           */
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Gold hairline inset — frames the card and stops it reading as a
            plain black rectangle in a busy social feed. */}
        <div
          style={{
            position: 'absolute',
            inset: 24,
            border: '1px solid rgba(201,169,110,0.45)',
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={520}
          height={520}
          style={{ objectFit: 'contain' }}
        />

        {/*
         * Only the domain is added. The artwork already carries the wordmark
         * and the "ELEGANCE • TRADITION • STYLE" tagline, so repeating either
         * would set the same words twice at two sizes.
         */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            fontSize: 22,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#C9A96E',
            fontFamily: 'sans-serif',
          }}
        >
          bansaricollection.in
        </div>
      </div>
    ),
    { ...size }
  );
}
