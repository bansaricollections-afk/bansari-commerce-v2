import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Bansari Collections — Indian Ethnic Wear';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #2d1515 0%, #7c3f3f 50%, #b5694a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* decorative border */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            border: '1.5px solid rgba(245,230,208,0.25)',
            borderRadius: 16,
          }}
        />
        {/* monogram */}
        <div
          style={{
            width: 100,
            height: 100,
            background: 'rgba(245,230,208,0.12)',
            borderRadius: 20,
            border: '1.5px solid rgba(245,230,208,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 60,
            color: '#f5e6d0',
            fontWeight: 700,
            fontFamily: 'serif',
            marginBottom: 32,
          }}
        >
          B
        </div>
        {/* brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#f5e6d0',
            fontFamily: 'serif',
            letterSpacing: '-1px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Bansari Collections
        </div>
        {/* tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(245,230,208,0.75)',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            letterSpacing: '0.5px',
          }}
        >
          Premium Indian Ethnic Wear
        </div>
      </div>
    ),
    { ...size }
  );
}
