import React from 'react'

export const SIGNATURE_PATH_1 =
  'M 285 530 C 170 540 85 490 90 390 C 95 285 180 250 290 255 C 365 260 385 340 405 345 C 425 350 455 295 505 295 C 525 295 530 315 530 325 C 530 270 520 120 545 95 C 565 75 605 85 625 150 C 645 220 635 345 595 400 C 565 440 500 455 380 430 C 275 410 190 490 215 520 C 245 550 430 460 700 495 L 950 155 L 690 495'
export const SIGNATURE_PATH_2 = 'M 195 495 L 950 155'

export const DEFAULT_SIGNATORY_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="1000" height="600" fill="none" stroke="%2309131f" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path d="${SIGNATURE_PATH_1}" /><path d="${SIGNATURE_PATH_2}" /></svg>`

export function AuthorisedSignatureSvg({
  className = 'id-signature-svg',
  color = '#09131f',
  strokeWidth = 14,
}: {
  className?: string
  color?: string
  strokeWidth?: number
}) {
  return (
    <svg
      viewBox="0 0 1000 600"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '105px',
        maxHeight: '34px',
        display: 'block',
      }}
    >
      <g
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={SIGNATURE_PATH_1} />
        <path d={SIGNATURE_PATH_2} />
      </g>
    </svg>
  )
}



