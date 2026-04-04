'use client'

export const AnimatedBackground = () => {
  const blobs = [
    {
      style: {
        width: 600,
        height: 600,
        background: 'radial-gradient(circle at 40% 40%, #a78bfa, #7c3aed)',
        top: '-180px',
        left: '-150px',
        animation: 'blob1 14s ease-in-out infinite',
        animationDelay: '0s',
      },
    },
    {
      style: {
        width: 550,
        height: 550,
        background: 'radial-gradient(circle at 60% 40%, #67e8f9, #06b6d4)',
        top: '-100px',
        right: '-160px',
        animation: 'blob2 17s ease-in-out infinite',
        animationDelay: '-4s',
      },
    },
    {
      style: {
        width: 500,
        height: 500,
        background: 'radial-gradient(circle at 50% 60%, #f9a8d4, #ec4899)',
        bottom: '5%',
        left: '15%',
        animation: 'blob3 15s ease-in-out infinite',
        animationDelay: '-7s',
      },
    },
    {
      style: {
        width: 460,
        height: 460,
        background: 'radial-gradient(circle at 45% 55%, #93c5fd, #3b82f6)',
        bottom: '10%',
        right: '5%',
        animation: 'blob4 18s ease-in-out infinite',
        animationDelay: '-2s',
      },
    },
    {
      style: {
        width: 380,
        height: 380,
        background: 'radial-gradient(circle at 50% 50%, #c4b5fd, #8b5cf6)',
        top: '40%',
        left: '40%',
        transform: 'translate(-50%, -50%)',
        animation: 'blob5 20s ease-in-out infinite',
        animationDelay: '-10s',
      },
    },
  ]

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            ...blob.style,
            filter: 'blur(50px)',
            opacity: 0.78,
          }}
        />
      ))}
    </div>
  )
}
