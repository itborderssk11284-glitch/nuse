/**
 * Official Hospital Logo Component
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 * High-definition vector emblem matching the official badge
 */

import React from 'react';

interface HospitalLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const HospitalLogo: React.FC<HospitalLogoProps> = ({
  className = '',
  size = 48,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
      >
        {/* Outer Circular Ring */}
        <circle cx="150" cy="150" r="146" fill="#026b38" stroke="#014d28" strokeWidth="4" />
        <circle cx="150" cy="150" r="139" fill="none" stroke="#ffffff" strokeWidth="2.5" />
        
        {/* Inner Ring */}
        <circle cx="150" cy="150" r="98" fill="#01522a" stroke="#ffffff" strokeWidth="2.5" />

        {/* Text Arc Definitions */}
        <defs>
          {/* Top Arc for Thai Name: โรงพยาบาลสังขละบุรี */}
          <path
            id="textArcTop"
            d="M 32 150 A 118 118 0 0 1 268 150"
            fill="none"
          />
          {/* Bottom Arc for English Name: SANGKHLABURI HOSPITAL */}
          <path
            id="textArcBottom"
            d="M 268 150 A 118 118 0 0 1 32 150"
            fill="none"
          />
        </defs>

        {/* Top Thai Text */}
        <text fill="#ffffff" fontSize="21" fontWeight="700" fontFamily="Sarabun, sans-serif" letterSpacing="1.5">
          <textPath href="#textArcTop" startOffset="50%" textAnchor="middle">
            โรงพยาบาลสังขละบุรี
          </textPath>
        </text>

        {/* Bottom English Text */}
        <text fill="#ffffff" fontSize="17" fontWeight="700" fontFamily="Prompt, sans-serif" letterSpacing="2">
          <textPath href="#textArcBottom" startOffset="50%" textAnchor="middle">
            SANGKHLABURI HOSPITAL
          </textPath>
        </text>

        {/* Left & Right Decorative Thai Floral Ornaments */}
        {/* Left Kanok ornament */}
        <g transform="translate(18, 142) scale(0.65)" fill="#ffffff">
          <path d="M12 0 C16 4 18 10 12 16 C8 20 2 20 4 12 C6 4 10 2 12 0 Z" />
          <path d="M14 14 C18 17 18 24 13 28 C9 31 4 28 6 22 C8 17 12 15 14 14 Z" />
          <circle cx="12" cy="14" r="2.5" />
        </g>
        {/* Right Kanok ornament */}
        <g transform="translate(268, 142) scale(0.65)" fill="#ffffff">
          <path d="M12 0 C8 4 6 10 12 16 C16 20 22 20 20 12 C18 4 14 2 12 0 Z" />
          <path d="M10 14 C6 17 6 24 11 28 C15 31 20 28 18 22 C16 17 12 15 10 14 Z" />
          <circle cx="12" cy="14" r="2.5" />
        </g>

        {/* Center Medical Emblem */}
        <g id="medicalEmblem">
          {/* Flame of the Torch */}
          <path
            d="M 150 72 
               C 142 85, 134 94, 140 106 
               C 134 100, 130 92, 134 84 
               C 126 94, 128 108, 136 116 
               C 142 122, 146 125, 150 126 
               C 154 125, 158 122, 164 116 
               C 172 108, 174 94, 166 84 
               C 170 92, 166 100, 160 106 
               C 166 94, 158 85, 150 72 Z"
            fill="#ffffff"
          />
          <path
            d="M 150 86
               C 146 95, 142 102, 146 112
               C 148 116, 152 118, 150 122
               C 148 118, 152 116, 154 112
               C 158 102, 154 95, 150 86 Z"
            fill="#e2e8f0"
          />

          {/* Torch Cup / Lotus Capital */}
          <path
            d="M 141 126 
               C 136 130, 133 134, 135 138 
               L 165 138 
               C 167 134, 164 130, 159 126 Z"
            fill="#ffffff"
          />
          <line x1="133" y1="138" x2="167" y2="138" stroke="#01522a" strokeWidth="2" />

          {/* Wings */}
          {/* Left Wing */}
          <path
            d="M 140 142
               C 125 130, 95 128, 72 144
               C 85 152, 102 154, 114 150
               C 98 160, 88 174, 94 186
               C 106 182, 118 172, 126 160
               C 120 174, 115 188, 122 198
               C 130 190, 136 176, 140 162 Z"
            fill="#ffffff"
          />
          {/* Right Wing */}
          <path
            d="M 160 142
               C 175 130, 205 128, 228 144
               C 215 152, 198 154, 186 150
               C 202 160, 212 174, 206 186
               C 194 182, 182 172, 174 160
               C 180 174, 185 188, 178 198
               C 170 190, 164 176, 160 162 Z"
            fill="#ffffff"
          />

          {/* Central Staff / Pillar */}
          <rect x="146.5" y="138" width="7" height="84" rx="2" fill="#ffffff" />

          {/* Entwined Serpents (Asclepius / Caduceus) */}
          {/* Snake Bodies curving around staff */}
          {/* Curve 1 (Upper loop) */}
          <path
            d="M 136 150
               C 120 156, 112 176, 128 184
               C 142 190, 158 178, 172 184
               C 188 190, 180 206, 168 212
               C 156 216, 146 214, 138 218"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 164 150
               C 180 156, 188 176, 172 184
               C 158 190, 142 178, 128 184
               C 112 190, 120 206, 132 212
               C 144 216, 154 214, 162 218"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Snake Heads */}
          <path d="M 134 148 C 130 144, 135 140, 139 144 C 137 148, 135 150, 134 148 Z" fill="#ffffff" />
          <path d="M 166 148 C 170 144, 165 140, 161 144 C 163 148, 165 150, 166 148 Z" fill="#ffffff" />

          {/* Staff Pedestal / Lotus Base */}
          <path
            d="M 143 222
               L 157 222
               L 159 229
               L 141 229 Z"
            fill="#ffffff"
          />
          <circle cx="150" cy="233" r="3.5" fill="#ffffff" />
          <path
            d="M 145 236 L 155 236 L 150 242 Z"
            fill="#ffffff"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-base md:text-lg leading-tight tracking-tight text-emerald-900 dark:text-emerald-300">
            โรงพยาบาลสังขละบุรี
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Sangkhlaburi Hospital Nursing Administration
          </span>
        </div>
      )}
    </div>
  );
};
