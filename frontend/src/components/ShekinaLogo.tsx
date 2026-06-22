interface ShekinaLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showCompany?: boolean
}

export default function ShekinaLogo({ size = 'md', showCompany = true }: ShekinaLogoProps) {
  const dims = { sm: 48, md: 72, lg: 96 }[size]

  return (
    <div className="flex flex-col items-center">
      {showCompany && (
        <p className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-2 font-medium">
          Comercial Shekina Ltda.
        </p>
      )}
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M40 4 L76 22 V58 L40 76 L4 58 V22 Z" fill="#004A99" />
        <path d="M40 12 L68 26 V54 L40 68 L12 54 V26 Z" fill="white" />
        <path d="M40 18 L62 29 V51 L40 62 L18 51 V29 Z" fill="#4CAF50" opacity="0.9" />
        <text
          x="40"
          y="48"
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          S
        </text>
        <path d="M40 4 L76 22 L68 26 L40 12 L12 26 L4 22 Z" fill="#F39200" opacity="0.85" />
      </svg>
    </div>
  )
}
