import React from 'react';

interface PersonaMaskIconProps {
  className?: string;
  fillColor?: string;
  eyeColor?: string;
}

export function PersonaMaskIcon({
  className = 'w-10 h-6',
  fillColor = 'currentColor',
  eyeColor = '#0B0B0D',
}: PersonaMaskIconProps) {
  return (
    <svg
      viewBox="0 0 100 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Silhueta da Máscara / Infinito Baile Persona */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M26 2C11.64 2 0 12.75 0 26C0 39.25 11.64 50 26 50C38.16 50 45.88 41.5 50 36.4C54.12 41.5 61.84 50 74 50C88.36 50 100 39.25 100 26C100 12.75 88.36 2 74 2C61.84 2 54.12 10.5 50 15.6C45.88 10.5 38.16 2 26 2ZM26 14C33.73 14 40 19.37 40 26C40 32.63 33.73 38 26 38C18.27 38 12 32.63 12 26C12 19.37 18.27 14 26 14ZM74 14C81.73 14 88 19.37 88 26C88 32.63 81.73 38 74 38C66.27 38 60 32.63 60 26C60 19.37 66.27 14 74 14Z"
        fill={fillColor}
      />
    </svg>
  );
}
