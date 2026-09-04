import { motion } from "motion/react";

export function ArchivingAnimation() {
  return (
    <div className="relative mx-auto flex h-52 w-full max-w-[340px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-50/70 via-slate-50/90 to-emerald-50/40 p-4 border border-emerald-100/60 shadow-inner">
      {/* Background ambient lighting */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-10 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-emerald-300/30 blur-2xl pointer-events-none"
      />

      <svg
        viewBox="0 0 320 200"
        className="h-full w-full select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bookshelf Background & Frame */}
        <g id="bookshelf">
          {/* Main Cabinet Backing */}
          <rect
            x="145"
            y="28"
            width="155"
            height="145"
            rx="8"
            fill="#0f172a"
            className="fill-slate-900"
          />
          <rect
            x="148"
            y="31"
            width="149"
            height="139"
            rx="6"
            fill="#1e293b"
            className="fill-slate-800"
          />

          {/* Top Shelf Slot */}
          <rect x="153" y="38" width="139" height="52" rx="3" fill="#0f172a" />
          <line
            x1="153"
            y1="90"
            x2="292"
            y2="90"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Bottom Shelf Slot */}
          <rect x="153" y="98" width="139" height="52" rx="3" fill="#0f172a" />
          <line
            x1="153"
            y1="150"
            x2="292"
            y2="150"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Top Shelf Static Binders (Kejaksaan Intelligence Registers) */}
          {/* Binder 1: R.In.1 */}
          <g>
            <rect x="160" y="44" width="16" height="44" rx="2" fill="#047857" />
            <rect x="163" y="48" width="10" height="12" rx="1" fill="#ecfdf5" />
            <line x1="168" y1="65" x2="168" y2="82" stroke="#065f46" strokeWidth="2" strokeLinecap="round" />
            <circle cx="168" cy="74" r="2" fill="#fbbf24" />
          </g>

          {/* Binder 2: R.In.2 */}
          <g>
            <rect x="179" y="42" width="15" height="46" rx="2" fill="#0f766e" />
            <rect x="181.5" y="46" width="10" height="11" rx="1" fill="#f0fdfa" />
            <line x1="186.5" y1="62" x2="186.5" y2="82" stroke="#115e59" strokeWidth="2" strokeLinecap="round" />
            <circle cx="186.5" cy="72" r="1.5" fill="#f59e0b" />
          </g>

          {/* Binder 3: R.In.3 */}
          <g>
            <rect x="197" y="45" width="16" height="43" rx="2" fill="#065f46" />
            <rect x="200" y="49" width="10" height="12" rx="1" fill="#ecfdf5" />
            <line x1="205" y1="66" x2="205" y2="82" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
            <circle cx="205" cy="75" r="2" fill="#fbbf24" />
          </g>

          {/* Empty space in middle top shelf where the active book is being archived */}
          <rect
            x="216"
            y="42"
            width="22"
            height="46"
            rx="2"
            fill="#10b981"
            fillOpacity="0.08"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Binder 4 (Right side of top shelf) */}
          <g>
            <rect x="242" y="43" width="16" height="45" rx="2" fill="#1e3a8a" />
            <rect x="245" y="47" width="10" height="12" rx="1" fill="#eff6ff" />
            <line x1="250" y1="64" x2="250" y2="82" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" />
            <circle cx="250" cy="73" r="2" fill="#60a5fa" />
          </g>
          {/* Binder 5 */}
          <g>
            <rect x="261" y="46" width="14" height="42" rx="2" fill="#334155" />
            <rect x="263.5" y="50" width="9" height="10" rx="1" fill="#f8fafc" />
            <circle cx="268" cy="72" r="1.5" fill="#94a3b8" />
          </g>
          {/* Binder 6 (Leaning) */}
          <g transform="rotate(12 278 86)">
            <rect x="277" y="43" width="13" height="44" rx="2" fill="#475569" />
            <rect x="279.5" y="47" width="8" height="10" rx="1" fill="#f8fafc" />
          </g>

          {/* Bottom Shelf Archive Binders */}
          <g>
            <rect x="160" y="104" width="18" height="44" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect x="163" y="108" width="12" height="12" rx="1" fill="#e2e8f0" />
            <circle cx="169" cy="132" r="2" fill="#e2e8f0" />
          </g>
          <g>
            <rect x="181" y="102" width="16" height="46" rx="2" fill="#047857" />
            <rect x="183.5" y="106" width="11" height="12" rx="1" fill="#ecfdf5" />
            <circle cx="189" cy="132" r="2" fill="#fbbf24" />
          </g>
          <g>
            <rect x="200" y="105" width="20" height="43" rx="2" fill="#065f46" />
            <rect x="203" y="109" width="14" height="12" rx="1" fill="#ecfdf5" />
            <circle cx="210" cy="132" r="2" fill="#34d399" />
          </g>
          <g>
            <rect x="223" y="104" width="17" height="44" rx="2" fill="#1e3a8a" />
            <rect x="225.5" y="108" width="12" height="12" rx="1" fill="#eff6ff" />
            <circle cx="231.5" cy="132" r="2" fill="#93c5fd" />
          </g>
          <g>
            <rect x="243" y="103" width="18" height="45" rx="2" fill="#0f766e" />
            <rect x="246" y="107" width="12" height="12" rx="1" fill="#f0fdfa" />
            <circle cx="252" cy="132" r="2" fill="#5eead4" />
          </g>
          <g>
            <rect x="264" y="106" width="14" height="42" rx="2" fill="#334155" />
            <rect x="266.5" y="110" width="9" height="10" rx="1" fill="#f8fafc" />
            <circle cx="271" cy="132" r="1.5" fill="#94a3b8" />
          </g>
        </g>

        {/* Floating Sparks / Verification Particles */}
        <motion.circle
          cx="227"
          cy="48"
          r="2.5"
          fill="#34d399"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.4, 0.5],
            y: [-3, -12, -18],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.circle
          cx="234"
          cy="55"
          r="1.8"
          fill="#fbbf24"
          animate={{
            opacity: [0, 0.9, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -10, -15],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: 0.8,
            ease: "easeOut",
          }}
        />

        {/* Officer / Person Archiving Animation */}
        <g id="officer">
          {/* Legs & Lower Body */}
          <rect x="68" y="132" width="14" height="44" rx="5" fill="#1e293b" />
          <rect x="85" y="132" width="14" height="44" rx="5" fill="#0f172a" />
          {/* Shoes */}
          <path d="M66 172 H84 C85 172 86 174 84 176 H64 C64 174 65 172 66 172 Z" fill="#090d16" />
          <path d="M83 172 H102 C103 172 104 174 102 176 H81 C81 174 82 172 83 172 Z" fill="#090d16" />

          {/* Torso & Uniform (Kejaksaan Emerald Green Tone & Lanyard) */}
          <motion.g
            animate={{
              y: [0, -1.5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Body / Blazer */}
            <path
              d="M58 84 C58 74 65 68 83 68 C101 68 108 74 108 84 L104 135 C104 137 101 139 99 139 H67 C65 139 62 137 62 135 Z"
              fill="#065f46"
            />
            {/* Inner White Shirt & Tie */}
            <polygon points="76,68 90,68 83,92" fill="#ffffff" />
            <polygon points="81,72 85,72 84,98 83,101 82,98" fill="#d97706" />
            {/* Badge / ID Pin */}
            <rect x="66" y="86" width="6" height="8" rx="1" fill="#fbbf24" />

            {/* Head & Hair */}
            <circle cx="83" cy="50" r="14" fill="#fed7aa" />
            {/* Professional Hair */}
            <path
              d="M69 48 C69 36 76 34 83 34 C91 34 98 36 98 46 C96 43 93 42 89 42 C83 42 79 45 76 49 Z"
              fill="#1e293b"
            />
            <path
              d="M69 47 C68 49 68 53 71 55 C71 52 70 49 69 47 Z"
              fill="#1e293b"
            />
            {/* Ear */}
            <circle cx="73" cy="51" r="2.5" fill="#fdba74" />
            {/* Glasses / Face details */}
            <rect x="80" y="47" width="7" height="5" rx="1.5" stroke="#0f172a" strokeWidth="1" fill="none" />
            <line x1="75" y1="49" x2="80" y2="49" stroke="#0f172a" strokeWidth="0.8" />
            {/* Friendly smiling cheek curve */}
            <path d="M85 57 Q88 59 90 57" stroke="#ea580c" strokeWidth="0.8" strokeLinecap="round" fill="none" />

            {/* Left Static Arm / Hand Support */}
            <path
              d="M60 84 Q52 105 64 116 Q69 118 72 114 Q63 103 68 88 Z"
              fill="#047857"
            />
            <circle cx="68" cy="116" r="4.5" fill="#fed7aa" />
          </motion.g>

          {/* Animated Right Arm & Book being placed into Cabinet */}
          <motion.g
            animate={{
              x: [0, 80, 80, 0],
              y: [0, -18, -18, 0],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.45, 0.65, 1],
            }}
          >
            {/* Arm Extension */}
            <path
              d="M98 82 Q120 74 145 68 Q150 72 147 77 Q123 83 102 91 Z"
              fill="#059669"
            />
            {/* Hand holding the Archival Binder */}
            <circle cx="147" cy="72" r="5" fill="#fed7aa" />
            <path d="M145 68 Q152 68 153 73" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />

            {/* The Active Intelligence Register Book / Binder (R.In.3 / Official Archival Book) */}
            <g transform="translate(138, 48)">
              {/* Binder Cover */}
              <motion.rect
                x="0"
                y="0"
                width="18"
                height="46"
                rx="2.5"
                fill="#047857"
                stroke="#10b981"
                strokeWidth="1"
                animate={{
                  boxShadow: [
                    "0px 0px 0px rgba(16,185,129,0)",
                    "0px 0px 8px rgba(16,185,129,0.8)",
                    "0px 0px 8px rgba(16,185,129,0.8)",
                    "0px 0px 0px rgba(16,185,129,0)",
                  ],
                }}
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  times: [0, 0.45, 0.65, 1],
                }}
              />
              {/* White Label on Spine */}
              <rect x="3" y="4" width="12" height="14" rx="1.5" fill="#ffffff" />
              {/* Text lines on label */}
              <line x1="5.5" y1="8" x2="12.5" y2="8" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5.5" y1="12" x2="10.5" y2="12" stroke="#047857" strokeWidth="1.2" strokeLinecap="round" />

              {/* Gold Emblem / Seal */}
              <circle cx="9" cy="27" r="3" fill="#fbbf24" />
              <polygon points="9,25 9.7,26.5 11.3,26.7 10.1,27.9 10.4,29.5 9,28.7 7.6,29.5 7.9,27.9 6.7,26.7 8.3,26.5" fill="#b45309" />

              {/* Spine Grip Ring */}
              <circle cx="9" cy="38" r="2.2" fill="#065f46" stroke="#34d399" strokeWidth="0.8" />
            </g>
          </motion.g>
        </g>

        {/* Floor Line with Shadow */}
        <ellipse cx="160" cy="177" rx="130" ry="6" fill="#64748b" fillOpacity="0.15" />
        <ellipse cx="82" cy="176" rx="28" ry="4" fill="#334155" fillOpacity="0.2" />
        <ellipse cx="220" cy="174" rx="75" ry="5" fill="#0f172a" fillOpacity="0.25" />
      </svg>

      {/* Floating Status Pill Indicator */}
      <motion.div
        animate={{
          y: [0, -3, 0],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 shadow-sm backdrop-blur-sm border border-emerald-200/70"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
        </span>
        Pengarsipan Intelijen Aktif
      </motion.div>
    </div>
  );
}
