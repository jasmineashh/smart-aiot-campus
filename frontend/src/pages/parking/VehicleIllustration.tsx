import { useId } from 'react'

// ==========================================
// SUPPORTED VEHICLE BODY TYPES
// ==========================================

export type VehicleBodyType =
  | 'Sedan'
  | 'SUV'
  | 'Hatchback'
  | 'Coupe'
  | 'Pickup'
  | 'Van'
  | 'Wagon'
  | 'Convertible'

interface VehicleIllustrationProps {
  bodyType: VehicleBodyType | null
  colorHex?: string
  colorName?: string
  className?: string
}

interface VehicleShape {
  body: string
  windows: string
  doors: string
  handles: [number, number][]
  rearWheelX: number
  frontWheelX: number
  wheelY: number
  wheelRadius: number
  roofRails?: string
  trim?: string
}

// ==========================================
// VEHICLE BODY GEOMETRY
// ==========================================

const VEHICLE_SHAPES: Record<
  VehicleBodyType,
  VehicleShape
> = {
  Sedan: {
    body:
      'M20 91 L26 70 L76 61 L115 30 ' +
      'Q125 24 143 24 H217 ' +
      'Q232 25 248 43 L276 63 L326 71 ' +
      'Q341 76 342 94 L338 106 H20Z',

    windows:
      'M90 60 L124 34 H165 V60Z ' +
      'M173 34 H215 Q227 35 239 48 ' +
      'L253 60 H173Z',

    doors:
      'M169 64 V101 M258 65 L265 100',

    handles: [
      [148, 70],
      [237, 70],
    ],

    rearWheelX: 76,
    frontWheelX: 286,
    wheelY: 104,
    wheelRadius: 22,
  },

  SUV: {
    body:
      'M20 99 L25 42 Q27 20 48 18 H218 ' +
      'Q238 19 254 42 L283 65 L325 73 ' +
      'Q341 79 342 99 V111 H20Z',

    windows:
      'M41 30 H91 V61 H36Z ' +
      'M100 30 H158 V61 H100Z ' +
      'M167 30 H216 Q228 32 241 48 ' +
      'L256 61 H167Z',

    doors:
      'M96 65 V106 M164 65 V106 ' +
      'M261 65 V106',

    handles: [
      [143, 72],
      [240, 72],
    ],

    rearWheelX: 76,
    frontWheelX: 286,
    wheelY: 105,
    wheelRadius: 25,

    roofRails:
      'M60 15 H205 M70 15 V19 ' +
      'M195 15 V19',

    trim:
      'M24 101 H338 V111 H24Z',
  },

  Hatchback: {
    body:
      'M22 94 L29 48 Q36 29 61 24 H208 ' +
      'L260 63 L318 72 Q334 77 336 95 ' +
      'V106 H22Z',

    windows:
      'M45 39 L67 34 H128 V61 H36Z ' +
      'M137 34 H204 L239 61 H137Z',

    doors:
      'M132 65 V101 M246 66 V101',

    handles: [
      [112, 70],
      [225, 70],
    ],

    rearWheelX: 74,
    frontWheelX: 278,
    wheelY: 104,
    wheelRadius: 21,
  },

  Coupe: {
    body:
      'M19 97 L29 77 L91 62 ' +
      'Q134 25 177 28 Q222 28 266 64 ' +
      'L326 74 Q340 81 341 99 ' +
      'L336 106 H19Z',

    windows:
      'M107 62 Q135 36 173 37 H181 V62Z ' +
      'M190 37 Q222 40 248 62 H190Z',

    doors:
      'M187 66 V102 M261 67 V101',

    handles: [
      [239, 70],
    ],

    rearWheelX: 76,
    frontWheelX: 286,
    wheelY: 104,
    wheelRadius: 23,
  },

  Pickup: {
    body:
      'M19 66 H132 V26 H209 ' +
      'Q230 27 249 49 L270 65 L322 73 ' +
      'Q340 80 341 100 V111 H19Z',

    windows:
      'M143 36 H178 V62 H143Z ' +
      'M187 36 H208 Q221 38 238 62 ' +
      'H187Z',

    doors:
      'M135 66 V106 M183 65 V106 ' +
      'M247 65 V106',

    handles: [
      [162, 73],
      [226, 73],
    ],

    rearWheelX: 76,
    frontWheelX: 284,
    wheelY: 105,
    wheelRadius: 25,

    trim:
      'M21 102 H338 V111 H21Z',
  },

  Van: {
    body:
      'M20 19 Q20 12 36 12 H217 ' +
      'Q237 15 251 40 L276 65 L322 77 ' +
      'Q338 84 339 101 V112 H20Z',

    windows:
      'M33 24 H94 V63 H33Z ' +
      'M103 24 H165 V63 H103Z ' +
      'M174 24 H213 Q226 27 248 63 ' +
      'H174Z',

    doors:
      'M99 68 V107 M170 68 V107 ' +
      'M256 68 V107',

    handles: [
      [147, 75],
      [235, 75],
    ],

    rearWheelX: 76,
    frontWheelX: 284,
    wheelY: 107,
    wheelRadius: 23,
  },

  Wagon: {
    body:
      'M20 97 L24 35 Q29 24 45 24 H210 ' +
      'Q231 27 251 48 L275 65 L326 74 ' +
      'Q340 80 341 98 V106 H20Z',

    windows:
      'M38 34 H96 V61 H34Z ' +
      'M105 34 H162 V61 H105Z ' +
      'M171 34 H210 Q228 37 253 61 ' +
      'H171Z',

    doors:
      'M100 65 V102 M166 65 V102 ' +
      'M259 65 V102',

    handles: [
      [145, 70],
      [237, 70],
    ],

    rearWheelX: 76,
    frontWheelX: 286,
    wheelY: 104,
    wheelRadius: 22,

    roofRails:
      'M53 20 H196 M63 20 V25 ' +
      'M186 20 V25',
  },

  Convertible: {
    body:
      'M20 98 L29 77 L91 62 H163 ' +
      'L193 37 L218 62 L326 75 ' +
      'Q340 80 341 99 V106 H20Z',

    windows:
      'M191 42 L211 62 H170Z',

    doors:
      'M166 65 V102 M251 65 V102',

    handles: [
      [230, 70],
    ],

    rearWheelX: 76,
    frontWheelX: 286,
    wheelY: 104,
    wheelRadius: 23,
  },
}

// ==========================================
// WHEEL COMPONENT
// ==========================================

interface WheelProps {
  x: number
  y: number
  radius: number
}

function Wheel({
  x,
  y,
  radius,
}: WheelProps) {
  const rimRadius = radius * 0.72
  const spokeRadius = rimRadius * 0.85

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Tire */}

      <circle
        r={radius}
        fill="#171d25"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      <circle
        r={radius - 3}
        fill="none"
        stroke="#39424e"
        strokeWidth="1"
      />

      {/* Alloy rim */}

      <circle
        r={rimRadius}
        fill="#aeb9c5"
        stroke="#dce2ea"
        strokeWidth="1.2"
      />

      <circle
        r={rimRadius - 3}
        fill="#485463"
      />

      {/* Alloy spokes */}

      {Array.from(
        { length: 6 },
        (_, index) => {
          const angle =
            index * Math.PI / 3

          const endX =
            Math.cos(angle) * spokeRadius

          const endY =
            Math.sin(angle) * spokeRadius

          return (
            <line
              key={index}
              x1="0"
              y1="0"
              x2={endX}
              y2={endY}
              stroke="#cbd5e1"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )
        }
      )}

      {/* Wheel hub */}

      <circle
        r={4.5}
        fill="#e2e8f0"
        stroke="#64748b"
        strokeWidth="0.8"
      />
    </g>
  )
}

// ==========================================
// MAIN VEHICLE ILLUSTRATION
// ==========================================

export default function VehicleIllustration({
  bodyType,
  colorHex = '#BFC5CC',
  colorName = 'Silver',
  className,
}: VehicleIllustrationProps) {
  const uniqueId = useId()

  const paintGradient =
    `${uniqueId}-paint`

  const glassGradient =
    `${uniqueId}-glass`

  const shadowGradient =
    `${uniqueId}-shadow`

  const safeColor =
    /^#[0-9a-fA-F]{6}$/.test(colorHex)
      ? colorHex
      : '#BFC5CC'

  // Avoid showing an incorrect default body type
  // before the user selects their vehicle.

  if (!bodyType || !VEHICLE_SHAPES[bodyType]) {
    return (
      <svg
        className={className}
        viewBox="0 0 360 140"
        role="img"
        aria-label="No vehicle selected"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="180"
          cy="119"
          rx="100"
          ry="6"
          fill="#94a3b8"
          opacity="0.15"
        />

        <g
          fill="none"
          stroke="#94a3b8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M107 86
               L119 54
               Q123 43 136 43
               H224
               Q237 43 241 54
               L253 86"
          />

          <rect
            x="100"
            y="77"
            width="160"
            height="35"
            rx="12"
          />

          <path
            d="M115 112 V121
               M245 112 V121"
          />

          <circle
            cx="126"
            cy="94"
            r="5"
          />

          <circle
            cx="234"
            cy="94"
            r="5"
          />

          <path d="M148 95 H212" />
        </g>
      </svg>
    )
  }

  const shape =
    VEHICLE_SHAPES[bodyType]

  return (
    <svg
      className={className}
      viewBox="0 0 360 145"
      role="img"
      aria-label={
        `${colorName} ${bodyType} illustration`
      }
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Metallic paint shading */}

        <linearGradient
          id={paintGradient}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stopColor="#ffffff"
            stopOpacity="0.38"
          />

          <stop
            offset="35%"
            stopColor="#ffffff"
            stopOpacity="0.10"
          />

          <stop
            offset="55%"
            stopColor="#ffffff"
            stopOpacity="0"
          />

          <stop
            offset="100%"
            stopColor="#000000"
            stopOpacity="0.30"
          />
        </linearGradient>

        {/* Window reflections */}

        <linearGradient
          id={glassGradient}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stopColor="#9db7cb"
          />

          <stop
            offset="45%"
            stopColor="#58738b"
          />

          <stop
            offset="100%"
            stopColor="#34495e"
          />
        </linearGradient>

        {/* Ground shadow */}

        <radialGradient id={shadowGradient}>
          <stop
            offset="0%"
            stopColor="#64748b"
            stopOpacity="0.28"
          />

          <stop
            offset="100%"
            stopColor="#64748b"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      {/* Ground shadow */}

      <ellipse
        cx="180"
        cy="130"
        rx="165"
        ry="11"
        fill={`url(#${shadowGradient})`}
      />

      {/* Optional roof rails */}

      {shape.roofRails && (
        <path
          d={shape.roofRails}
          fill="none"
          stroke="#475569"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Main painted body */}

      <path
        d={shape.body}
        fill={safeColor}
        stroke="#526176"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Paint lighting and depth */}

      <path
        d={shape.body}
        fill={`url(#${paintGradient})`}
      />

      {/* Vehicle windows */}

      <path
        d={shape.windows}
        fill={`url(#${glassGradient})`}
        stroke="#34495e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Window reflections */}

      <path
        d={shape.windows}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="0.7"
        strokeOpacity="0.35"
      />

      {/* Lower protective trim */}

      {shape.trim && (
        <path
          d={shape.trim}
          fill="#303843"
          opacity="0.9"
        />
      )}

      {/* Door separation lines */}

      <path
        d={shape.doors}
        fill="none"
        stroke="#273444"
        strokeOpacity="0.65"
        strokeWidth="1.1"
      />

      {/* Door handles */}

      {shape.handles.map(
        ([x, y], index) => (
          <rect
            key={index}
            x={x}
            y={y}
            width="13"
            height="3.5"
            rx="1.75"
            fill="#526176"
            opacity="0.85"
          />
        )
      )}

      {/* Side body highlight */}

      <path
        d="M29 89 H330"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeOpacity="0.23"
        fill="none"
      />

      {/* Rear tail light */}

      <rect
        x="22"
        y="78"
        width="15"
        height="9"
        rx="2.5"
        fill="#a71930"
        stroke="#721b29"
        strokeWidth="0.7"
      />

      <rect
        x="24"
        y="79.5"
        width="10"
        height="2.5"
        rx="1"
        fill="#ff8794"
        opacity="0.75"
      />

      {/* Front headlight */}

      <path
        d="M318 76 L335 82 L338 89 H318Z"
        fill="#fff4d6"
        stroke="#b9b4a5"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      <path
        d="M320 79 L334 84"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Front lower bumper */}

      <rect
        x="324"
        y="94"
        width="13"
        height="6"
        rx="2"
        fill="#475569"
      />

      {/* Rear wheel */}

      <Wheel
        x={shape.rearWheelX}
        y={shape.wheelY}
        radius={shape.wheelRadius}
      />

      {/* Front wheel */}

      <Wheel
        x={shape.frontWheelX}
        y={shape.wheelY}
        radius={shape.wheelRadius}
      />
    </svg>
  )
}
