import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const handle = searchParams.get('handle')
  const tool = searchParams.get('tool')
  const copies = searchParams.get('copies') ?? '0'
  const tools = searchParams.get('tools') ?? '0'

  if (handle !== null) {
    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(124, 58, 237, 0.12), transparent)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#fafafa',
              letterSpacing: '-0.02em',
            }}
          >
            @{handle}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 24,
              fontSize: 28,
              color: '#71717a',
            }}
          >
            <span>{copies} copies</span>
            <span style={{ color: '#3f3f46' }}>|</span>
            <span>{tools} tools</span>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 20,
              color: '#34d399',
              fontFamily: 'monospace',
              backgroundColor: '#18181b',
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #27272a',
            }}
          >
            $ npx usedev @{handle}
          </div>
          <div style={{ marginTop: 40, fontSize: 18, color: '#52525b' }}>getstack.com</div>
        </div>
      </div>,
      { width: 1200, height: 630 },
    )
  }

  if (tool !== null) {
    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(124, 58, 237, 0.12), transparent)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#fafafa' }}>{tool}</div>
          <div
            style={{
              marginTop: 32,
              fontSize: 20,
              color: '#34d399',
              fontFamily: 'monospace',
              backgroundColor: '#18181b',
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #27272a',
            }}
          >
            $ npx usedev install {tool}
          </div>
          <div style={{ marginTop: 40, fontSize: 18, color: '#52525b' }}>getstack.com</div>
        </div>
      </div>,
      { width: 1200, height: 630 },
    )
  }

  // Default OG image
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(124, 58, 237, 0.12), transparent)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#fafafa' }}>use</div>
        <div style={{ fontSize: 28, color: '#71717a', marginTop: 16 }}>
          Universal installer for AI-native devs
        </div>
        <div style={{ marginTop: 40, fontSize: 18, color: '#52525b' }}>getstack.com</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
