import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#7c3f3f',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontSize: 110,
          color: '#f5e6d0',
          fontWeight: 700,
          letterSpacing: '-2px',
        }}
      >
        B
      </div>
    ),
    { ...size }
  );
}
