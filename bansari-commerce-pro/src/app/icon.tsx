import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#7c3f3f',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontSize: 18,
          color: '#f5e6d0',
          fontWeight: 700,
          letterSpacing: '-0.5px',
        }}
      >
        B
      </div>
    ),
    { ...size }
  );
}
