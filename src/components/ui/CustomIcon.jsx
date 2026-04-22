import React from "react";

export const TaskAdd02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M19 13V8C19 5.17157 19 3.75736 18.1213 2.87868C17.2426 2 15.8284 2 13 2H9C6.17157 2 4.75736 2 3.87868 2.87868C3 3.75736 3 5.17157 3 8V16C3 18.8284 3 20.2426 3.87868 21.1213C4.75736 22 6.17157 22 9 22H14" />
    <path d="M14.5 2H7.5C7.5 3.41421 7.5 4.12132 7.93934 4.56066C8.37868 5 9.08579 5 10.5 5H11.5C12.9142 5 13.6213 5 14.0607 4.56066C14.5 4.12132 14.5 3.41421 14.5 2Z" />
    <path d="M7 15H11M7 11H15" />
    <path d="M21 19H18M18 19H15M18 19V22M18 19V16" />
  </svg>
);

export const TimeQuarterPass = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8.37574 3C8.16183 3.07993 7.95146 3.16712 7.74492 3.26126M20.7177 16.3011C20.8199 16.0799 20.9141 15.8542 21 15.6245M18.4988 19.3647C18.6705 19.2044 18.8365 19.0381 18.9963 18.866M15.2689 21.3723C15.463 21.2991 15.6541 21.22 15.8421 21.1351M12.156 21.9939C11.9251 22.0019 11.6926 22.0019 11.4616 21.9939M7.78731 21.1404C7.96811 21.2217 8.15183 21.2978 8.33825 21.3683M4.67255 18.9208C4.80924 19.0657 4.95029 19.2064 5.0955 19.3428M2.6327 15.6645C2.70758 15.8622 2.78867 16.0569 2.87572 16.2483M2.00497 12.5053C1.99848 12.2972 1.9985 12.0878 2.00497 11.8794M2.62545 8.73714C2.69901 8.54165 2.77864 8.34913 2.8641 8.1598M4.65602 5.47923C4.80068 5.32514 4.95025 5.17573 5.1045 5.03124" />
    <path d="M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5M13.5 12C13.5 11.1716 12.8284 10.5 12 10.5M13.5 12H16M12 10.5V6" />
    <path d="M22 12C22 6.47715 17.5228 2 12 2" />
  </svg>
);

export const DrawingMode = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16" />
    <path d="M16 9H15C12.1716 9 10.7574 9 9.87868 9.87868C9 10.7574 9 12.1716 9 15V16C9 18.8284 9 20.2426 9.87868 21.1213C10.7574 22 12.1716 22 15 22H16C18.8284 22 20.2426 22 21.1213 21.1213C22 20.2426 22 18.8284 22 16V15C22 12.1716 22 10.7574 21.1213 9.87868C20.2426 9 18.8284 9 16 9Z" />
  </svg>
);

export const BorderFull = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 11C3 7.25027 3 5.3754 3.95491 4.06107C4.26331 3.6366 4.6366 3.26331 5.06107 2.95491C6.3754 2 8.25027 2 12 2C15.7497 2 17.6246 2 18.9389 2.95491C19.3634 3.26331 19.7367 3.6366 20.0451 4.06107C21 5.3754 21 7.25027 21 11V13C21 16.7497 21 18.6246 20.0451 19.9389C19.7367 20.3634 19.3634 20.7367 18.9389 21.0451C17.6246 22 15.7497 22 12 22C8.25027 22 6.3754 22 5.06107 21.0451C4.6366 20.7367 4.26331 20.3634 3.95491 19.9389C3 18.6246 3 16.7497 3 13V11Z" />
    <path d="M15 9.5L7 9.5M10 14.5H7" />
  </svg>
);

export const Fire03 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12 21.5008C16.4183 21.5008 20 17.9191 20 13.5008C20 10.5397 18.3912 6.60684 16 4.33478L14 6.99915L10.5 2.49915C7 4.99915 4 9.59526 4 13.5008C4 17.9191 7.58172 21.5008 12 21.5008Z" />
    <path d="M12 18.4991C14.2091 18.4991 16 16.4844 16 13.9991C16 13.2081 15.8186 12.4648 15.5 11.8189L13.5 13.4991L10.5 9.49811C9.5 10.4981 8 12.1106 8 13.9991C8 16.4844 9.79086 18.4991 12 18.4991Z" />
  </svg>
);

export const Layers01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8.64298 3.14559L6.93816 3.93362C4.31272 5.14719 3 5.75397 3 6.75C3 7.74603 4.31272 8.35281 6.93817 9.56638L8.64298 10.3544C10.2952 11.1181 11.1214 11.5 12 11.5C12.8786 11.5 13.7048 11.1181 15.357 10.3544L17.0618 9.56638C19.6873 8.35281 21 7.74603 21 6.75C21 5.75397 19.6873 5.14719 17.0618 3.93362L15.357 3.14559C13.7048 2.38186 12.8786 2 12 2C11.1214 2 10.2952 2.38186 8.64298 3.14559Z" />
    <path d="M20.788 11.0972C20.9293 11.2959 21 11.5031 21 11.7309C21 12.7127 19.6873 13.3109 17.0618 14.5072L15.357 15.284C13.7048 16.0368 12.8786 16.4133 12 16.4133C11.1214 16.4133 10.2952 16.0368 8.64298 15.284L6.93817 14.5072C4.31272 13.3109 3 12.7127 3 11.7309C3 11.5031 3.07067 11.2959 3.212 11.0972" />
    <path d="M20.3767 16.2661C20.7922 16.5971 21 16.927 21 17.3176C21 18.2995 19.6873 18.8976 17.0618 20.0939L15.357 20.8707C13.7048 21.6236 12.8786 22 12 22C11.1214 22 10.2952 21.6236 8.64298 20.8707L6.93817 20.0939C4.31272 18.8976 3 18.2995 3 17.3176C3 16.927 3.20778 16.5971 3.62334 16.2661" />
  </svg>
);

export const ChatOutcome = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2 10.5C2 9.72921 2.01346 8.97679 2.03909 8.2503C2.12282 5.87683 2.16469 4.69009 3.13007 3.71745C4.09545 2.74481 5.3157 2.6926 7.7562 2.58819C9.09517 2.5309 10.5209 2.5 12 2.5C13.4791 2.5 14.9048 2.5309 16.2438 2.58819C18.6843 2.6926 19.9046 2.74481 20.8699 3.71745C21.8353 4.69009 21.8772 5.87683 21.9609 8.2503C21.9865 8.97679 22 9.72921 22 10.5C22 11.2708 21.9865 12.0232 21.9609 12.7497C21.8772 15.1232 21.8353 16.3099 20.8699 17.2826C19.9046 18.2552 18.6843 18.3074 16.2437 18.4118C15.5098 18.4432 14.7498 18.4667 13.9693 18.4815C13.2282 18.4955 12.8576 18.5026 12.532 18.6266C12.2064 18.7506 11.9325 18.9855 11.3845 19.4553L9.20503 21.3242C9.07273 21.4376 8.90419 21.5 8.72991 21.5C8.32679 21.5 8 21.1732 8 20.7701V18.4219C7.91842 18.4186 7.83715 18.4153 7.75619 18.4118C5.31569 18.3074 4.09545 18.2552 3.13007 17.2825C2.16469 16.3099 2.12282 15.1232 2.03909 12.7497C2.01346 12.0232 2 11.2708 2 10.5Z" />
    <path d="M12.5 7.5C12.5 7.5 15.5 9.70947 15.5 10.5C15.5 11.2906 12.5 13.5 12.5 13.5M15 10.5L8.5 10.5" />
  </svg>
);

export const Undo03 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 8H15C18.3137 8 21 10.6863 21 14C21 17.3137 18.3137 20 15 20H11" />
    <path d="M7 4L5.8462 4.87652C3.94873 6.31801 3 7.03875 3 8C3 8.96125 3.94873 9.68199 5.8462 11.1235L7 12" />
  </svg>
);

export const Clock01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8V12L14 14" />
  </svg>
);

export const Search01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M17 17L21 21" />
    <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" />
  </svg>
);

export const CheckmarkSquare02StrokeRounded = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
    <path d="M8 12.5L10.5 15L16 9" />
  </svg>
);

export const Upload05 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2.50006 13.5V6.5H21.5001V13.5C21.5001 17.2712 21.5001 19.1569 20.3285 20.3284C19.1569 21.5 17.2713 21.5 13.5001 21.5H10.5001C6.72883 21.5 4.84321 21.5 3.67163 20.3284C2.50006 19.1569 2.50006 17.2712 2.50006 13.5Z" />
    <path d="M2.50006 6.5L3.10006 5.7C4.27777 4.12972 4.86662 3.34458 5.71121 2.92229C6.55579 2.5 7.53721 2.5 9.50006 2.5H14.5001C16.4629 2.5 17.4443 2.5 18.2889 2.92229C19.1335 3.34458 19.7224 4.12972 20.9001 5.7L21.5001 6.5" />
    <path d="M15.0001 13.5C15.0001 13.5 12.7906 10.5 12 10.5C11.2095 10.5 9.00006 13.5 9.00006 13.5M12 11L12.0001 17.5" />
  </svg>
);

export const PlusSignSquare = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
    <path d="M12 8V16M16 12H8" />
  </svg>
);

export const ChartLineData01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3" />
    <path d="M5 20C5.43938 16.8438 7.67642 8.7643 10.4282 8.7643C12.3301 8.7643 12.8226 12.6353 14.6864 12.6353C17.8931 12.6353 17.4282 4 21 4" />
  </svg>
);

export const Archive = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V10C21 6.22876 21 4.34315 19.8284 3.17157C18.6569 2 16.7712 2 13 2Z" />
    <path d="M21 12H3" />
    <path d="M15 7H9" />
    <path d="M15 17H9" />
  </svg>
);

export const TaskAdd01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13.498 2H8.49805C7.66962 2 6.99805 2.67157 6.99805 3.5C6.99805 4.32843 7.66962 5 8.49805 5H13.498C14.3265 5 14.998 4.32843 14.998 3.5C14.998 2.67157 14.3265 2 13.498 2Z" />
    <path d="M6.99805 15H10.4266M6.99805 11H14.998" />
    <path d="M18.998 12.9995L18.9981 9.48263C18.9981 6.65424 18.9981 5.24004 18.1194 4.36137C17.4781 3.72007 16.5515 3.54681 14.9981 3.5M13.998 21.9995L8.99805 21.9995C6.16963 21.9995 4.75541 21.9995 3.87674 21.1208C2.99806 20.2421 2.99805 18.8279 2.99805 15.9995L2.99806 9.48269C2.99805 6.65425 2.99805 5.24004 3.87673 4.36136C4.51802 3.72007 5.44456 3.54681 6.99795 3.5" />
    <path d="M20.998 19H17.998M17.998 19H14.998M17.998 19V22M17.998 19V16" />
  </svg>
);

export const DiscoverSquare = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12.4014 8.29796L15.3213 7.32465C16.2075 7.02924 16.6507 6.88153 16.8846 7.11544C17.1185 7.34935 16.9708 7.79247 16.6753 8.67871L15.702 11.5986C15.1986 13.1088 14.9469 13.8639 14.4054 14.4054C13.8639 14.9469 13.1088 15.1986 11.5986 15.702L8.67871 16.6753C7.79247 16.9708 7.34935 17.1185 7.11544 16.8846C6.88153 16.6507 7.02924 16.2075 7.32465 15.3213L8.29796 12.4014C8.80136 10.8912 9.05306 10.1361 9.59457 9.59457C10.1361 9.05306 10.8912 8.80136 12.4014 8.29796Z" />
    <path d="M12.125 12H12M12.25 12C12.25 12.1381 12.1381 12.25 12 12.25C11.8619 12.25 11.75 12.1381 11.75 12C11.75 11.8619 11.8619 11.75 12 11.75C12.1381 11.75 12.25 11.8619 12.25 12Z" />
    <path d="M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z" />
  </svg>
);

export const Settings01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z" />
    <path d="M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z" />
  </svg>
);

export const Home01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z" />
    <path d="M15.0002 17C14.2007 17.6224 13.1504 18 12.0002 18C10.8499 18 9.79971 17.6224 9.00018 17" />
  </svg>
);

export const Calendar03 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M16 2V6M8 2V6" />
    <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" />
    <path d="M3 10H21" />
    <path d="M12.1258 14H12.0008M12.1258 18H12.0008M7.625 14H7.5M7.625 18H7.5M16.625 14H16.5M12.2508 14C12.2508 14.1381 12.1389 14.25 12.0008 14.25C11.8628 14.25 11.7508 14.1381 11.7508 14C11.7508 13.8619 11.8628 13.75 12.0008 13.75C12.1389 13.75 12.2508 13.8619 12.2508 14ZM12.2508 18C12.2508 18.1381 12.1389 18.25 12.0008 18.25C11.8628 18.25 11.7508 18.1381 11.7508 18C11.7508 17.8619 11.8628 17.75 12.0008 17.75C12.1389 17.75 12.2508 17.8619 12.2508 18ZM7.75 14C7.75 14.1381 7.63807 14.25 7.5 14.25C7.36193 14.25 7.25 14.1381 7.25 14C7.25 13.8619 7.36193 13.75 7.5 13.75C7.63807 13.75 7.75 13.8619 7.75 14ZM7.75 18C7.75 18.1381 7.63807 18.25 7.5 18.25C7.36193 18.25 7.25 18.1381 7.25 18C7.25 17.8619 7.36193 17.75 7.5 17.75C7.63807 17.75 7.75 17.8619 7.75 18ZM16.75 14C16.75 14.1381 16.6381 14.25 16.5 14.25C16.3619 14.25 16.25 14.1381 16.25 14C16.25 13.8619 16.3619 13.75 16.5 13.75C16.6381 13.75 16.75 13.8619 16.75 14Z" />
  </svg>
);

export const NanoTechnology = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M5 16L10 13M14 11L19 8M12 5V10M12 14V19M5 8L10 11M14 13L19 16" />
    <path d="M20.5 9.00001V14.5M13.5 20.5L19 17.5M4.5 17.5L10.5 20.5M3.5 15V9.00001M4.5 6.5L10.5 3.5M19.5 6.5L13.5 3.5" />
    <circle cx="12" cy="3.5" r="1.5" />
    <circle cx="12" cy="20.5" r="1.5" />
    <circle cx="3.5" cy="7.5" r="1.5" />
    <circle cx="20.5" cy="7.5" r="1.5" />
    <circle cx="20.5" cy="16.5" r="1.5" />
    <circle cx="3.5" cy="16.5" r="1.5" />
    <path d="M12 9.75L14 10.875V13.125L12 14.25L10 13.125V10.875L12 9.75Z" />
  </svg>
);

export const Circle = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export const DashedLineCircle = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M14 2.20004C13.3538 2.06886 12.6849 2 12 2C11.3151 2 10.6462 2.06886 10 2.20004M21.8 10C21.9311 10.6462 22 11.3151 22 12C22 12.6849 21.9311 13.3538 21.8 14M14 21.8C13.3538 21.9311 12.6849 22 12 22C11.3151 22 10.6462 21.9311 10 21.8M2.20004 14C2.06886 13.3538 2 12.6849 2 12C2 11.3151 2.06886 10.6462 2.20004 10M17.5 3.64702C18.6332 4.39469 19.6053 5.36678 20.353 6.5M20.353 17.5C19.6053 18.6332 18.6332 19.6053 17.5 20.353M6.5 20.353C5.36678 19.6053 4.39469 18.6332 3.64702 17.5M3.64702 6.5C4.39469 5.36678 5.36678 4.39469 6.5 3.64702" />
  </svg>
);

export const GitFork = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M6 8C7.10457 8 8 7.10457 8 6C8 4.89543 7.10457 4 6 4C4.89543 4 4 4.89543 4 6C4 7.10457 4.89543 8 6 8Z" />
    <path d="M12 20C13.1046 20 14 19.1046 14 18C14 16.8954 13.1046 16 12 16C10.8954 16 10 16.8954 10 18C10 19.1046 10.8954 20 12 20Z" />
    <path d="M18 8C19.1046 8 20 7.10457 20 6C20 4.89543 19.1046 4 18 4C16.8954 4 16 4.89543 16 6C16 7.10457 16.8954 8 18 8Z" />
    <path d="M6.01734 8.74067C6.01734 10.4142 5.77537 12.1995 9.22051 11.9855H12.0053M17.9929 8.57617C18.1259 11.9855 16.9199 11.7648 15.7861 11.9855H12.0053M12.0053 15.7001V11.9855" />
  </svg>
);

export const AiBrain01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M7 4.5C5.34315 4.5 4 5.84315 4 7.5C4 8.06866 4.15822 8.60037 4.43304 9.0535C3.04727 9.31855 2 10.537 2 12C2 13.463 3.04727 14.6814 4.43304 14.9465M7 4.5C7 3.11929 8.11929 2 9.5 2C10.8807 2 12 3.11929 12 4.5V19.5C12 20.8807 10.8807 22 9.5 22C8.11929 22 7 20.8807 7 19.5C5.34315 19.5 4 18.1569 4 16.5C4 15.9313 4.15822 15.3996 4.43304 14.9465M7 4.5C7 5.31791 7.39278 6.04408 8 6.50018M4.43304 14.9465C4.78948 14.3588 5.34207 13.9032 6 13.6707" />
    <path d="M17 19.4999C18.6569 19.4999 20 18.1567 20 16.4999C20 15.9312 19.8418 15.3995 19.567 14.9464C20.9527 14.6813 22 13.4629 22 11.9999C22 10.5369 20.9527 9.31843 19.567 9.05338M17 19.4999C17 20.8806 15.8807 21.9999 14.5 21.9999C13.1193 21.9999 12 20.8806 12 19.4999L12 4.49988C12 3.11917 13.1193 1.99988 14.5 1.99988C15.8807 1.99988 17 3.11917 17 4.49988C18.6569 4.49988 20 5.84302 20 7.49988C20 8.06854 19.8418 8.60024 19.567 9.05338M17 19.4999C17 18.682 16.6072 17.9558 16 17.4997M19.567 9.05338C19.2105 9.64109 18.6579 10.0966 18 10.3292" />
  </svg>
);

export const File02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8 17H16" />
    <path d="M8 13H12" />
    <path d="M13 2.5V3C13 5.82843 13 7.24264 13.8787 8.12132C14.7574 9 16.1716 9 19 9H19.5M20 10.6569V14C20 17.7712 20 19.6569 18.8284 20.8284C17.6569 22 15.7712 22 12 22C8.22876 22 6.34315 22 5.17157 20.8284C4 19.6569 4 17.7712 4 14V9.45584C4 6.21082 4 4.58831 4.88607 3.48933C5.06508 3.26731 5.26731 3.06508 5.48933 2.88607C6.58831 2 8.21082 2 11.4558 2C12.1614 2 12.5141 2 12.8372 2.11401C12.9044 2.13772 12.9702 2.165 13.0345 2.19575C13.3436 2.34355 13.593 2.593 14.0919 3.09188L18.8284 7.82843C19.4065 8.40649 19.6955 8.69552 19.8478 9.06306C20 9.4306 20 9.83935 20 10.6569Z" />
  </svg>
);

export const TaskRemove01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13.498 2H8.49805C7.66962 2 6.99805 2.67157 6.99805 3.5C6.99805 4.32843 7.66962 5 8.49805 5H13.498C14.3265 5 14.998 4.32843 14.998 3.5C14.998 2.67157 14.3265 2 13.498 2Z" />
    <path d="M6.99805 15H10.4266M6.99805 11H14.998" />
    <path d="M18.998 13.9995L18.9981 9.48263C18.9981 6.65424 18.9981 5.24004 18.1194 4.36137C17.4781 3.72007 16.5515 3.54681 14.9981 3.5M12.998 21.9995L8.99805 21.9995C6.16963 21.9995 4.75541 21.9995 3.87674 21.1208C2.99806 20.2421 2.99805 18.8279 2.99805 15.9995L2.99806 9.48269C2.99805 6.65425 2.99805 5.24004 3.87673 4.36136C4.51802 3.72007 5.44456 3.54681 6.99795 3.5" />
    <path d="M20.998 17L18.498 19.5M18.498 19.5L15.998 22M18.498 19.5L20.998 22M18.498 19.5L15.998 17" />
  </svg>
);

export const Structure05 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2 5C2 2.518 2.518 2 5 2H7C9.482 2 10 2.518 10 5C10 7.482 9.482 8 7 8H5C2.518 8 2 7.482 2 5Z" />
    <path d="M15 9C15 6.518 15.4532 6 17.625 6H19.375C21.5468 6 22 6.518 22 9C22 11.482 21.5468 12 19.375 12H17.625C15.4532 12 15 11.482 15 9Z" />
    <path d="M13 19C13 16.518 13.518 16 16 16H18C20.482 16 21 16.518 21 19C21 21.482 20.482 22 18 22H16C13.518 22 13 21.482 13 19Z" />
    <path d="M15 7L10 5L13.5714 16" />
  </svg>
);

export const File01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8 7L16 7" />
    <path d="M8 11L12 11" />
    <path d="M13 21.5V21C13 18.1716 13 16.7574 13.8787 15.8787C14.7574 15 16.1716 15 19 15H19.5M20 13.3431V10C20 6.22876 20 4.34315 18.8284 3.17157C17.6569 2 15.7712 2 12 2C8.22877 2 6.34315 2 5.17157 3.17157C4 4.34314 4 6.22876 4 10L4 14.5442C4 17.7892 4 19.4117 4.88607 20.5107C5.06508 20.7327 5.26731 20.9349 5.48933 21.1139C6.58831 22 8.21082 22 11.4558 22C12.1614 22 12.5141 22 12.8372 21.886C12.9044 21.8623 12.9702 21.835 13.0345 21.8043C13.3436 21.6564 13.593 21.407 14.0919 20.9081L18.8284 16.1716C19.4065 15.5935 19.6955 15.3045 19.8478 14.9369C20 14.5694 20 14.1606 20 13.3431Z" />
  </svg>
);

export const TaskRemove02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M19.25 14V8C19.25 5.17157 19.25 3.75736 18.3713 2.87868C17.4926 2 16.0784 2 13.25 2H9.25C6.42157 2 5.00736 2 4.12868 2.87868C3.25 3.75736 3.25 5.17157 3.25 8V16C3.25 18.8284 3.25 20.2426 4.12868 21.1213C5.00736 22 6.42157 22 9.25 22H13.25" />
    <path d="M14.75 2H7.75C7.75 3.41421 7.75 4.12132 8.18934 4.56066C8.62868 5 9.33579 5 10.75 5H11.75C13.1642 5 13.8713 5 14.3107 4.56066C14.75 4.12132 14.75 3.41421 14.75 2Z" />
    <path d="M7.25 15H11.25M7.25 11H15.25" />
    <path d="M21.25 17L18.75 19.5M18.75 19.5L16.25 22M18.75 19.5L21.25 22M18.75 19.5L16.25 17" />
  </svg>
);

export const Briefcase08 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M1.99934 14L1.99935 13.4999C1.99935 10.2 1.99936 8.55012 3.02448 7.525C4.04961 6.49988 5.69952 6.49988 8.99935 6.49988H15.0005C18.2999 6.49988 19.9495 6.49988 20.9746 7.5248C21.9997 8.54971 22 10.1994 22.0005 13.4987L22.0006 13.999C22.0012 17.2994 22.0015 18.9496 20.9763 19.9749C19.9511 21.0003 18.3009 21.0002 15.0005 21.0002L8.99919 21C5.69941 21 4.04953 20.9999 3.02443 19.9748C1.99933 18.9497 1.99934 17.2998 1.99934 14Z" />
    <path d="M8.49934 6.49988C8.49934 5.09542 8.49934 4.39318 8.8364 3.88874C8.98232 3.67036 9.16982 3.48286 9.3882 3.33694C9.89265 2.99988 10.5949 2.99988 11.9993 2.99988C13.4038 2.99988 14.106 2.99988 14.6105 3.33694C14.8289 3.48286 15.0164 3.67036 15.1623 3.88874C15.4993 4.39318 15.4993 5.09542 15.4993 6.49988" />
    <path d="M5.99924 10.4999H17.9992" />
  </svg>
);

export const Blockchain03 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12 19C12.2094 19 12.4041 18.9011 12.7934 18.7032L15.9228 17.1128C17.3076 16.4091 18 16.0572 18 15.5V8.5M12 19C11.7906 19 11.5959 18.9011 11.2066 18.7032L8.07717 17.1128C6.69239 16.4091 6 16.0572 6 15.5V8.5M12 19V12M18 8.5C18 7.94278 17.3076 7.59091 15.9228 6.88716L12.7934 5.29679C12.4041 5.09893 12.2094 5 12 5C11.7906 5 11.5959 5.09893 11.2066 5.29679L8.07717 6.88716C6.69239 7.59091 6 7.94278 6 8.5M18 8.5C18 9.05722 17.3076 9.40909 15.9228 10.1128L12.7934 11.7032C12.4041 11.9011 12.2094 12 12 12M6 8.5C6 9.05722 6.69239 9.40909 8.07717 10.1128L11.2066 11.7032C11.5959 11.9011 11.7906 12 12 12" />
    <path d="M13.1901 21.576L17.8842 19.3041C19.9614 18.2987 21 17.796 21 17V7C21 6.20397 19.9614 5.70129 17.8842 4.69594L13.1901 2.42399L13.1901 2.42398C12.6061 2.14133 12.3141 2 12 2C11.6859 2 11.3939 2.14133 10.8099 2.42399L6.11576 4.69594C4.03859 5.70129 3 6.20397 3 7V17C3 17.796 4.03858 18.2987 6.11572 19.304L6.11576 19.3041L10.8099 21.576C11.3939 21.8587 11.6859 22 12 22C12.3141 22 12.6061 21.8587 13.1901 21.576Z" />
  </svg>
);

export const Star = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z" />
  </svg>
);

export const Setting06 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M20.7906 9.15201C21.5969 10.5418 22 11.2366 22 12C22 12.7634 21.5969 13.4582 20.7906 14.848L18.8669 18.1638C18.0638 19.548 17.6623 20.2402 17.0019 20.6201C16.3416 21 15.5402 21 13.9373 21L10.0627 21C8.45982 21 7.6584 21 6.99807 20.6201C6.33774 20.2402 5.93619 19.548 5.13311 18.1638L3.20942 14.848C2.40314 13.4582 2 12.7634 2 12C2 11.2366 2.40314 10.5418 3.20942 9.152L5.13311 5.83621C5.93619 4.45196 6.33774 3.75984 6.99807 3.37992C7.6584 3 8.45982 3 10.0627 3L13.9373 3C15.5402 3 16.3416 3 17.0019 3.37992C17.6623 3.75984 18.0638 4.45197 18.8669 5.83622L20.7906 9.15201Z" />
    <path d="M9 8L15 16" />
  </svg>
);

export const Pin = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 21L8 16" />
    <path d="M13.2585 18.8714C9.51516 18.0215 5.97844 14.4848 5.12853 10.7415C4.99399 10.1489 4.92672 9.85266 5.12161 9.37197C5.3165 8.89129 5.55457 8.74255 6.03071 8.44509C7.10705 7.77265 8.27254 7.55888 9.48209 7.66586C11.1793 7.81598 12.0279 7.89104 12.4512 7.67048C12.8746 7.44991 13.1622 6.93417 13.7376 5.90269L14.4664 4.59604C14.9465 3.73528 15.1866 3.3049 15.7513 3.10202C16.316 2.89913 16.6558 3.02199 17.3355 3.26771C18.9249 3.84236 20.1576 5.07505 20.7323 6.66449C20.978 7.34417 21.1009 7.68401 20.898 8.2487C20.6951 8.8134 20.2647 9.05346 19.4039 9.53358L18.0672 10.2792C17.0376 10.8534 16.5229 11.1406 16.3024 11.568C16.0819 11.9955 16.162 12.8256 16.3221 14.4859C16.4399 15.7068 16.2369 16.88 15.5555 17.9697C15.2577 18.4458 15.1088 18.6839 14.6283 18.8786C14.1477 19.0733 13.8513 19.006 13.2585 18.8714Z" />
  </svg>
);

export const Folder01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C22 9.08996 22 10.1433 22 12.25C22 15.7612 22 17.5167 21.1573 18.7779C20.7926 19.3238 20.3238 19.7926 19.7779 20.1573C18.5167 21 16.7612 21 13.25 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7" />
  </svg>
);

export const CheckmarkSquare02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
    <path d="M8 12.5L10.5 15L16 9" />
  </svg>
);

export const Structure04 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2 12C2 9.518 2.518 9 5 9H7C9.482 9 10 9.518 10 12C10 14.482 9.482 15 7 15H5C2.518 15 2 14.482 2 12Z" />
    <path d="M14 7C14 4.518 14.518 4 17 4H19C21.482 4 22 4.518 22 7C22 9.482 21.482 10 19 10H17C14.518 10 14 9.482 14 7Z" />
    <path d="M14 17C14 14.518 14.518 14 17 14H19C21.482 14 22 14.518 22 17C22 19.482 21.482 20 19 20H17C14.518 20 14 19.482 14 17Z" />
    <path d="M14 7L11 12L14 17" />
  </svg>
);

export const Link01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M9.14339 10.691L9.35031 10.4841C11.329 8.50532 14.5372 8.50532 16.5159 10.4841C18.4947 12.4628 18.4947 15.671 16.5159 17.6497L13.6497 20.5159C11.671 22.4947 8.46279 22.4947 6.48405 20.5159C4.50532 18.5372 4.50532 15.329 6.48405 13.3503L6.9484 12.886" />
    <path d="M17.0516 11.114L17.5159 10.6497C19.4947 8.67095 19.4947 5.46279 17.5159 3.48405C15.5372 1.50532 12.329 1.50532 10.3503 3.48405L7.48405 6.35031C5.50532 8.32904 5.50532 11.5372 7.48405 13.5159C9.46279 15.4947 12.671 15.4947 14.6497 13.5159L14.8566 13.309" />
  </svg>
);

export const Target02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7" />
    <path d="M14 2.20004C13.3538 2.06886 12.6849 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.3151 21.9311 10.6462 21.8 10" />
    <path d="M12.0303 11.9625L16.5832 7.4096M19.7404 4.34462L19.1872 2.35748C19.0853 2.03011 18.6914 1.89965 18.4259 2.11662C16.9898 3.29018 15.4254 4.87091 16.703 7.36419C19.2771 8.56455 20.7466 6.94584 21.8733 5.5853C22.0975 5.3146 21.9623 4.90767 21.6247 4.81005L19.7404 4.34462Z" />
  </svg>
);

export const AiMagic = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M10 7L9.48415 8.39405C8.80774 10.222 8.46953 11.136 7.80278 11.8028C7.13603 12.4695 6.22204 12.8077 4.39405 13.4842L3 14L4.39405 14.5158C6.22204 15.1923 7.13603 15.5305 7.80278 16.1972C8.46953 16.864 8.80774 17.778 9.48415 19.6059L10 21L10.5158 19.6059C11.1923 17.778 11.5305 16.864 12.1972 16.1972C12.864 15.5305 13.778 15.1923 15.6059 14.5158L17 14L15.6059 13.4842C13.778 12.8077 12.864 12.4695 12.1972 11.8028C11.5305 11.136 11.1923 10.222 10.5158 8.39405L10 7Z" />
    <path d="M18 3L17.7789 3.59745C17.489 4.38087 17.3441 4.77259 17.0583 5.05833C16.7726 5.34408 16.3809 5.48903 15.5975 5.77892L15 6L15.5975 6.22108C16.3809 6.51097 16.7726 6.65592 17.0583 6.94167C17.3441 7.22741 17.489 7.61913 17.7789 8.40255L18 9L18.2211 8.40255C18.511 7.61913 18.6559 7.22741 18.9417 6.94166C19.2274 6.65592 19.6191 6.51097 20.4025 6.22108L21 6L20.4025 5.77892C19.6191 5.48903 19.2274 5.34408 18.9417 5.05833C18.6559 4.77259 18.511 4.38087 18.2211 3.59745L18 3Z" />
  </svg>
);

export const FolderLinks = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M14 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C22 9.08996 22 10.1433 22 12.25C22 12.8889 22 13.4697 21.9949 14" />
    <path d="M17.6863 20.4315C18.4444 21.1895 19.6734 21.1895 20.4315 20.4315C21.1895 19.6734 21.1895 18.4444 20.4315 17.6863L18.7157 15.9705C17.9922 15.247 16.8396 15.2141 16.077 15.8717M16.3137 13.5685C15.5556 12.8105 14.3266 12.8105 13.5685 13.5685C12.8105 14.3266 12.8105 15.5557 13.5685 16.3137L15.2843 18.0294C16.0078 18.753 17.1604 18.7859 17.9231 18.1282" />
  </svg>
);

export const DashedLine02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M6.3 2.75143C5.26076 2.94471 4.49591 3.28657 3.89124 3.89124C3.28657 4.49591 2.94471 5.26076 2.75143 6.3M17.7 2.75143C18.7392 2.94471 19.5041 3.28657 20.1088 3.89124C20.7134 4.49591 21.0553 5.26076 21.2486 6.3M13.9 2.50495C13.3156 2.5 12.6839 2.5 12 2.5C11.3161 2.5 10.6844 2.5 10.1 2.50495M21.495 10.1C21.5 10.6844 21.5 11.3161 21.5 12C21.5 12.6839 21.5 13.3156 21.495 13.9001M2.50495 10.1C2.5 10.6844 2.5 11.3161 2.5 12C2.5 12.6839 2.5 13.3156 2.50496 13.9001M2.75143 17.7C2.94471 18.7392 3.28657 19.5041 3.89124 20.1088C4.49591 20.7134 5.26076 21.0553 6.3 21.2486M21.2486 17.7C21.0553 18.7392 20.7134 19.5041 20.1088 20.1088C19.5041 20.7134 18.7392 21.0553 17.7 21.2486M13.9 21.495C13.3156 21.5 12.6839 21.5 12 21.5C11.3162 21.5 10.6845 21.5 10.1002 21.495" />
  </svg>
);

export const FilterHorizontal = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 7H6" />
    <path d="M3 17H9" />
    <path d="M18 17L21 17" />
    <path d="M15 7L21 7" />
    <path d="M6 7C6 6.06812 6 5.60218 6.15224 5.23463C6.35523 4.74458 6.74458 4.35523 7.23463 4.15224C7.60218 4 8.06812 4 9 4C9.93188 4 10.3978 4 10.7654 4.15224C11.2554 4.35523 11.6448 4.74458 11.8478 5.23463C12 5.60218 12 6.06812 12 7C12 7.93188 12 8.39782 11.8478 8.76537C11.6448 9.25542 11.2554 9.64477 10.7654 9.84776C10.3978 10 9.93188 10 9 10C8.06812 10 7.60218 10 7.23463 9.84776C6.74458 9.64477 6.35523 9.25542 6.15224 8.76537C6 8.39782 6 7.93188 6 7Z" />
    <path d="M12 17C12 16.0681 12 15.6022 12.1522 15.2346C12.3552 14.7446 12.7446 14.3552 13.2346 14.1522C13.6022 14 14.0681 14 15 14C15.9319 14 16.3978 14 16.7654 14.1522C17.2554 14.3552 17.6448 14.7446 17.8478 15.2346C18 15.6022 18 16.0681 18 17C18 17.9319 18 18.3978 17.8478 18.7654C17.6448 19.2554 17.2554 19.6448 16.7654 19.8478C16.3978 20 15.9319 20 15 20C14.0681 20 13.6022 20 13.2346 19.8478C12.7446 19.6448 12.3552 19.2554 12.1522 18.7654C12 18.3978 12 17.9319 12 17Z" />
  </svg>
);

export const Pen01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3.49977 18.9853V20.5H5.01449C6.24074 20.5 6.85387 20.5 7.40518 20.2716C7.9565 20.0433 8.39004 19.6097 9.25713 18.7426L19.1211 8.87868C20.0037 7.99612 20.4449 7.55483 20.4937 7.01325C20.5018 6.92372 20.5018 6.83364 20.4937 6.74411C20.4449 6.20253 20.0037 5.76124 19.1211 4.87868C18.2385 3.99612 17.7972 3.55483 17.2557 3.50605C17.1661 3.49798 17.0761 3.49798 16.9865 3.50605C16.4449 3.55483 16.0037 3.99612 15.1211 4.87868L5.25713 14.7426C4.39004 15.6097 3.9565 16.0433 3.72813 16.5946C3.49977 17.1459 3.49977 17.759 3.49977 18.9853Z" />
    <path d="M13.5 6.5L17.5 10.5" />
  </svg>
);

export const Share01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M9.39584 4.5H8.35417C5.40789 4.5 3.93475 4.5 3.01946 5.37868C2.10417 6.25736 2.10417 7.67157 2.10417 10.5V14.5C2.10417 17.3284 2.10417 18.7426 3.01946 19.6213C3.93475 20.5 5.40789 20.5 8.35417 20.5H12.5608C15.5071 20.5 16.9802 20.5 17.8955 19.6213C18.4885 19.052 18.6973 18.2579 18.7708 17" />
    <path d="M16.1667 7V3.85355C16.1667 3.65829 16.3316 3.5 16.535 3.5C16.6326 3.5 16.7263 3.53725 16.7954 3.60355L21.5275 8.14645C21.7634 8.37282 21.8958 8.67986 21.8958 9C21.8958 9.32014 21.7634 9.62718 21.5275 9.85355L16.7954 14.3964C16.7263 14.4628 16.6326 14.5 16.535 14.5C16.3316 14.5 16.1667 14.3417 16.1667 14.1464V11H13.1157C8.875 11 7.3125 14.5 7.3125 14.5V12C7.3125 9.23858 9.64435 7 12.5208 7H16.1667Z" />
  </svg>
);

export const Home08 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z" />
    <path d="M17 15.5H15V17.5H17V15.5Z" />
  </svg>
);

export const Globe02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z" />
    <path d="M21 15H3" />
    <path d="M21 9H3" />
  </svg>
);

export const Filter = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8.85746 12.5061C6.36901 10.6456 4.59564 8.59915 3.62734 7.44867C3.3276 7.09253 3.22938 6.8319 3.17033 6.3728C2.96811 4.8008 2.86701 4.0148 3.32795 3.5074C3.7889 3 4.60404 3 6.23433 3H17.7657C19.396 3 20.2111 3 20.672 3.5074C21.133 4.0148 21.0319 4.8008 20.8297 6.37281C20.7706 6.83191 20.6724 7.09254 20.3726 7.44867C19.403 8.60062 17.6261 10.6507 15.1326 12.5135C14.907 12.6821 14.7583 12.9567 14.7307 13.2614C14.4837 15.992 14.2559 17.4876 14.1141 18.2442C13.8853 19.4657 12.1532 20.2006 11.226 20.8563C10.6741 21.2466 10.0043 20.782 9.93278 20.1778C9.79643 19.0261 9.53961 16.6864 9.25927 13.2614C9.23409 12.9539 9.08486 12.6761 8.85746 12.5061Z" />
  </svg>
);

export const DatabaseExport = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <ellipse cx="11" cy="5" rx="8" ry="3" />
    <path d="M6 10.8418C6.60158 11.0226 7.27434 11.1716 8 11.2817" />
    <path d="M11 15C6.58172 15 3 13.6569 3 12" />
    <path d="M6 17.8418C6.60158 18.0226 7.27434 18.1716 8 18.2817" />
    <path d="M11 22C6.58172 22 3 20.6569 3 19V5M19 5V12" />
    <path d="M19 16.6735L17.8258 15.1869C17.2008 14.3956 16.8883 14 16.5 14C16.1117 14 15.7992 14.3956 15.1742 15.1869L14 16.6735M16.5 14.0872V22" />
  </svg>
);

export const LeftToRightListBullet = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8 5.5L20 5.5" />
    <path d="M8 12.5L20 12.5" />
    <path d="M8 19.5L20 19.5" />
    <path d="M4.375 5.5H4.25M4.5 5.5C4.5 5.63807 4.38807 5.75 4.25 5.75C4.11193 5.75 4 5.63807 4 5.5C4 5.36193 4.11193 5.25 4.25 5.25C4.38807 5.25 4.5 5.36193 4.5 5.5Z" />
    <path d="M4.375 12.5H4.25M4.5 12.5C4.5 12.6381 4.38807 12.75 4.25 12.75C4.11193 12.75 4 12.6381 4 12.5C4 12.3619 4.11193 12.25 4.25 12.25C4.38807 12.25 4.5 12.3619 4.5 12.5Z" />
    <path d="M4.375 19.5H4.25M4.5 19.5C4.5 19.6381 4.38807 19.75 4.25 19.75C4.11193 19.75 4 19.6381 4 19.5C4 19.3619 4.11193 19.25 4.25 19.25C4.38807 19.25 4.5 19.3619 4.5 19.5Z" />
  </svg>
);

export const Link04 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M10 13.229C10.1416 13.4609 10.3097 13.6804 10.5042 13.8828C11.7117 15.1395 13.5522 15.336 14.9576 14.4722C15.218 14.3121 15.4634 14.1157 15.6872 13.8828L18.9266 10.5114C20.3578 9.02184 20.3578 6.60676 18.9266 5.11718C17.4953 3.6276 15.1748 3.62761 13.7435 5.11718L13.03 5.85978" />
    <path d="M10.9703 18.14L10.2565 18.8828C8.82526 20.3724 6.50471 20.3724 5.07345 18.8828C3.64218 17.3932 3.64218 14.9782 5.07345 13.4886L8.31287 10.1172C9.74413 8.62761 12.0647 8.6276 13.4959 10.1172C13.6904 10.3195 13.8584 10.539 14 10.7708" />
  </svg>
);

export const Wrench01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M20.3584 13.3567C19.1689 14.546 16.9308 14.4998 13.4992 14.4998C11.2914 14.4998 9.50138 12.7071 9.50024 10.4993C9.50024 7.07001 9.454 4.83065 10.6435 3.64138C11.8329 2.45212 12.3583 2.50027 17.6274 2.50027C18.1366 2.49809 18.3929 3.11389 18.0329 3.47394L15.3199 6.18714C14.6313 6.87582 14.6294 7.99233 15.3181 8.68092C16.0068 9.36952 17.1234 9.36959 17.8122 8.68109L20.5259 5.96855C20.886 5.60859 21.5019 5.86483 21.4997 6.37395C21.4997 11.6422 21.5479 12.1675 20.3584 13.3567Z" />
    <path d="M13.5 14.5L7.32842 20.6716C6.22386 21.7761 4.433 21.7761 3.32843 20.6716C2.22386 19.567 2.22386 17.7761 3.32843 16.6716L9.5 10.5" />
    <path d="M5.50896 18.5H5.5" />
  </svg>
);

export const CheckmarkCircle02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
    <path d="M8 12.5L10.5 15L16 9" />
  </svg>
);

export const JusticeScale01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12 5V22M12 22H9M12 22H15" />
    <path d="M21 13L18.5 8L16 13" />
    <path d="M8 13L5.5 8L3 13" />
    <path d="M4 8H5.0482C6.31166 8 7.5375 7.471 8.5241 6.5C10.5562 4.5 13.4438 4.5 15.4759 6.5C16.4625 7.471 17.6883 8 18.9518 8H20" />
    <path d="M18.5 17C19.8547 17 21.0344 16.1663 21.6473 14.9349C21.978 14.2702 22.1434 13.9379 21.8415 13.469C21.5396 13 21.04 13 20.0407 13H16.9593C15.96 13 15.4604 13 15.1585 13.469C14.8566 13.9379 15.022 14.2702 15.3527 14.9349C15.9656 16.1663 17.1453 17 18.5 17Z" />
    <path d="M5.5 17C6.85471 17 8.03442 16.1663 8.64726 14.9349C8.97802 14.2702 9.14339 13.9379 8.84151 13.469C8.53962 13 8.04 13 7.04075 13H3.95925C2.96 13 2.46038 13 2.15849 13.469C1.85661 13.9379 2.02198 14.2702 2.35273 14.9349C2.96558 16.1663 4.14528 17 5.5 17Z" />
    <path d="M13.5 3.5C13.5 4.32843 12.8284 5 12 5C11.1716 5 10.5 4.32843 10.5 3.5C10.5 2.67157 11.1716 2 12 2C12.8284 2 13.5 2.67157 13.5 3.5Z" />
  </svg>
);

export const Delete01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" />
    <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" />
  </svg>
);

export const StickyNote03 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M14 20.5V20C14 17.1716 14 15.7574 14.8787 14.8787C15.7574 14 17.1716 14 20 14H20.5" />
    <path d="M13 3H11C7.22876 3 5.34315 3 4.17157 4.17157C3 5.34315 3 7.22876 3 11V13C3 16.7712 3 18.6569 4.17157 19.8284C5.34315 21 7.22876 21 11 21H12.3431C13.1606 21 13.5694 21 13.9369 20.8478C14.3045 20.6955 14.5935 20.4065 15.1716 19.8284L19.8284 15.1716C20.4065 14.5935 20.6955 14.3045 20.8478 13.9369C21 13.5694 21 13.1606 21 12.3431V11C21 7.22876 21 5.34315 19.8284 4.17157C18.6569 3 16.7712 3 13 3Z" />
  </svg>
);

export const Unavailable = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M5.25 5L19.25 19" />
    <path d="M22.25 12C22.25 6.47715 17.7728 2 12.25 2C6.72715 2 2.25 6.47715 2.25 12C2.25 17.5228 6.72715 22 12.25 22C17.7728 22 22.25 17.5228 22.25 12Z" />
  </svg>
);

export const Undo = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C8.79275 3 5.97733 4.67765 4.38341 7.20327M3.29339 3.00076L3.46556 5.05452C3.58958 6.53384 3.65159 7.27349 4.13359 7.68914C4.61559 8.10479 5.32673 8.03185 6.74899 7.88595L8.79339 7.67625" />
  </svg>
);

export const NotepadTextDashed = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13 22.0005H11M16.5 3.58926C17.6376 3.70116 18.4033 3.95405 18.9749 4.52558C19.6998 5.25055 19.9121 6.28798 19.9743 8.00046M7.5 3.58926C6.3624 3.70116 5.59666 3.95405 5.02513 4.52558C4.30016 5.25055 4.08789 6.28798 4.02573 8.00046M20 12.0005V14.0005M4 12.0005V14.0005M19.9504 18.0005C19.8638 19.4199 19.6264 20.3238 18.9749 20.9753C18.4914 21.4588 17.869 21.7143 17 21.8492M4.04962 18.0005C4.13616 19.4199 4.3736 20.3238 5.02513 20.9753C5.5086 21.4588 6.13105 21.7143 7 21.8492" />
    <path d="M16.5 2.00046V5.00046M7.5 2.00046V5.00046M12 2.00046V5.00046" />
    <path d="M8 15.0005H12M8 11.0005H16" />
  </svg>
);

export const Calendar04 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M16 2V6M8 2V6" />
    <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" />
    <path d="M3 10H21" />
  </svg>
);

export const UploadSquare01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
    <path d="M16 11.5C16 11.5 13.054 7.50001 12 7.5C10.9459 7.49999 8 11.5 8 11.5M12 8V16.5" />
  </svg>
);

export const FileLink = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M4 10L4 14.5442C4 17.7892 4 19.4117 4.88607 20.5107C5.06508 20.7327 5.26731 20.9349 5.48933 21.1139C6.58831 22 8.21082 22 11.4558 22C12.1614 22 12.5141 22 12.8372 21.886C12.9044 21.8623 12.9702 21.835 13.0345 21.8043C13.3436 21.6564 13.593 21.407 14.0919 20.9081L18.8284 16.1716C19.4065 15.5935 19.6955 15.3045 19.8478 14.9369C20 14.5694 20 14.1606 20 13.3431V10C20 6.22876 20 4.34315 18.8284 3.17157C17.6569 2 15.7712 2 12 2M13 21.5V21C13 18.1716 13 16.7574 13.8787 15.8787C14.7574 15 16.1716 15 19 15H19.5" />
    <path d="M9.27212 10.3604C10.1249 11.2132 11.5076 11.2132 12.3604 10.3604C13.2132 9.50754 13.2132 8.12489 12.3604 7.27206L10.4302 5.34185C9.61625 4.52786 8.31952 4.49081 7.46157 5.23071M7.72789 2.63961C6.8751 1.7868 5.49246 1.7868 4.63959 2.63961C3.7868 3.49242 3.7868 4.87511 4.63959 5.72792L6.56984 7.65812C7.38376 8.47213 8.6805 8.50919 9.53844 7.76923" />
  </svg>
);

export const BalanceScale = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="2" />
    <path d="M10 5H4M14 5H20" />
    <path d="M17 21H7" />
    <path d="M12 7V21" />
    <path d="M22 14C22 15.6569 20.6569 17 19 17C17.3431 17 16 15.6569 16 14M22 14L19.5 8H18.5L16 14M22 14H16" />
    <path d="M8 14C8 15.6569 6.65685 17 5 17C3.34315 17 2 15.6569 2 14M8 14L5.5 8H4.5L2 14M8 14H2" />
  </svg>
);

export const FolderAdd = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C21.9796 9.05942 21.9992 10.0588 22 12" />
    <path d="M18 13V21M22 17H14" />
  </svg>
);

export const CancelSquare = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12 21.5H12H12C16.4783 21.5 18.7175 21.5 20.1088 20.1088C21.5 18.7175 21.5 16.4783 21.5 12V12V12C21.5 7.52165 21.5 5.28248 20.1088 3.89124C18.7175 2.5 16.4783 2.5 12 2.5C7.52166 2.5 5.28249 2.5 3.89124 3.89124C2.5 5.28249 2.5 7.52166 2.5 12C2.5 16.4783 2.5 18.7175 3.89124 20.1088C5.28248 21.5 7.52165 21.5 12 21.5Z" />
    <path d="M15 9L9 14.9996M15 15L9 9.00039" />
  </svg>
);

export const Book02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M15.5 7H8.5M12.499 11H8.49902" />
    <path d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V6C20 4.11438 20 3.17157 19.4142 2.58579C18.8284 2 17.8856 2 16 2H10C7.17157 2 5.75736 2 4.87868 2.87868C4 3.75736 4 5.17157 4 8V20Z" />
    <path d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22" />
  </svg>
);

export const FolderLibrary = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M16.2627 10.5H7.73725C5.15571 10.5 3.86494 10.5 3.27143 11.3526C2.67793 12.2052 3.11904 13.4258 4.00126 15.867L5.08545 18.867C5.54545 20.1398 5.77545 20.7763 6.2889 21.1381C6.80235 21.5 7.47538 21.5 8.82143 21.5H15.1786C16.5246 21.5 17.1976 21.5 17.7111 21.1381C18.2245 20.7763 18.4545 20.1398 18.9146 18.867L19.9987 15.867C20.881 13.4258 21.3221 12.2052 20.7286 11.3526C20.1351 10.5 18.8443 10.5 16.2627 10.5Z" />
    <path d="M19 8C19 7.53406 19 7.30109 18.9239 7.11732C18.8224 6.87229 18.6277 6.67761 18.3827 6.57612C18.1989 6.5 17.9659 6.5 17.5 6.5H6.5C6.03406 6.5 5.80109 6.5 5.61732 6.57612C5.37229 6.67761 5.17761 6.87229 5.07612 7.11732C5 7.30109 5 7.53406 5 8" />
    <path d="M16.5 4C16.5 3.53406 16.5 3.30109 16.4239 3.11732C16.3224 2.87229 16.1277 2.67761 15.8827 2.57612C15.6989 2.5 15.4659 2.5 15 2.5H9C8.53406 2.5 8.30109 2.5 8.11732 2.57612C7.87229 2.67761 7.67761 2.87229 7.57612 3.11732C7.5 3.30109 7.5 3.53406 7.5 4" />
  </svg>
);

export const Flag02 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M4 7L4 21" />
    <path d="M11.7576 3.90865C8.45236 2.22497 5.85125 3.21144 4.55426 4.2192C4.32048 4.40085 4.20358 4.49167 4.10179 4.69967C4 4.90767 4 5.10138 4 5.4888V14.7319C4.9697 13.6342 7.87879 11.9328 11.7576 13.9086C15.224 15.6744 18.1741 14.9424 19.5697 14.1795C19.7633 14.0737 19.8601 14.0207 19.9301 13.9028C20 13.7849 20 13.6569 20 13.4009V5.87389C20 5.04538 20 4.63113 19.8027 4.48106C19.6053 4.33099 19.1436 4.459 18.2202 4.71504C16.64 5.15319 14.3423 5.22532 11.7576 3.90865Z" />
  </svg>
);

export const Global = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
    <path d="M20 5.69899C19.0653 5.76636 17.8681 6.12824 17.0379 7.20277C15.5385 9.14361 14.039 9.30556 13.0394 8.65861C11.5399 7.6882 12.8 6.11636 11.0401 5.26215C9.89313 4.70542 9.73321 3.19045 10.3716 2" />
    <path d="M2 11C2.7625 11.6621 3.83046 12.2682 5.08874 12.2682C7.68843 12.2682 8.20837 12.7649 8.20837 14.7518C8.20837 16.7387 8.20837 16.7387 8.72831 18.2288C9.06651 19.1981 9.18472 20.1674 8.5106 21" />
    <path d="M22 13.4523C21.1129 12.9411 20 12.7308 18.8734 13.5405C16.7177 15.0898 15.2314 13.806 14.5619 15.0889C13.5765 16.9775 17.0957 17.5711 14 22" />
  </svg>
);

export const ArrowDown01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" />
  </svg>
);

export const ArrowUp01 = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M17.9998 15C17.9998 15 13.5809 9.00001 11.9998 9C10.4187 8.99999 5.99985 15 5.99985 15" />
  </svg>
);

export const ChevronRight = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    className={className} style={color ? { color } : undefined}
    stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M9 6C9 6 15 10.4189 15 12C15 13.5812 9 18 9 18" />
  </svg>
);

export const OpusIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 9.08333C5 7.91667 6 7.5 6.5 7.5C7.49411 7.5 8 8.25383 8 9.08333C8 11.0163 6.65685 12 5 12C3.34315 12 2 10.433 2 8.5C2 6.567 3.34315 5 5 5H19C20.6569 5 22 6.567 22 8.5C22 10.433 20.6569 12 19 12C17.3431 12 16 11.0163 16 9.08333C16 8.25383 16.5059 7.5 17.5 7.5C18 7.5 19 7.91667 19 9.08333" />
    <path d="M3 20C3 19.4477 3.44772 19 4 19H20C20.5523 19 21 19.4477 21 20V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V20Z" />
    <path d="M13 9H11" />
    <path d="M9.5 19L9.5 15M14.5 19L14.5 15" />
    <path d="M19 5C19 3.58579 19 2.87868 18.5607 2.43934C18.1213 2 17.4142 2 16 2H8C6.58579 2 5.87868 2 5.43934 2.43934C5 2.87868 5 3.58579 5 5" />
    <path d="M5 12V19H19V12" />
  </svg>
);

export const CodexIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.5502 3C6.69782 3.00694 4.6805 3.10152 3.39128 4.39073C2 5.78202 2 8.02125 2 12.4997C2 16.9782 2 19.2174 3.39128 20.6087C4.78257 22 7.0218 22 11.5003 22C15.9787 22 18.218 22 19.6093 20.6087C20.8985 19.3195 20.9931 17.3022 21 13.4498" />
    <path d="M11.0556 13C10.3322 3.86635 16.8023 1.27554 21.9805 2.16439C22.1896 5.19136 20.7085 6.32482 17.8879 6.84825C18.4326 7.41736 19.395 8.13354 19.2912 9.02879C19.2173 9.66586 18.7846 9.97843 17.9194 10.6036C16.0231 11.9736 13.8264 12.8375 11.0556 13Z" />
    <path d="M9 17C11 11.5 12.9604 9.63636 15 8" />
  </svg>
);

export const ConnexaIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
    <path d="M20 18C21.1046 18 22 17.1046 22 16C22 14.8954 21.1046 14 20 14C18.8954 14 18 14.8954 18 16C18 17.1046 18.8954 18 20 18Z" />
    <path d="M11 22C12.1046 22 13 21.1046 13 20C13 18.8954 12.1046 18 11 18C9.89543 18 9 18.8954 9 20C9 21.1046 9.89543 22 11 22Z" />
    <path d="M15 6C16.1046 6 17 5.10457 17 4C17 2.89543 16.1046 2 15 2C13.8954 2 13 2.89543 13 4C13 5.10457 13.8954 6 15 6Z" />
    <path d="M4 10C5.10457 10 6 9.10457 6 8C6 6.89543 5.10457 6 4 6C2.89543 6 2 6.89543 2 8C2 9.10457 2.89543 10 4 10Z" />
    <path d="M14.2983 5.87309L12.7032 10.1268M13.1207 4.68359L5.88086 7.31625M11.7527 13.9847L11.2489 18.0152M13.79 12.8945L18.2115 15.1053M18.1727 16.8124L12.8288 19.1874" />
  </svg>
);

export const LedgerIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V18.6667C20 19.9128 20 20.5359 19.7321 21C19.5565 21.304 19.304 21.5565 19 21.732C18.5359 22 17.9128 22 16.6667 22H7.33333C6.08718 22 5.4641 22 5 21.732C4.69596 21.5565 4.44349 21.304 4.26795 21C4 20.5359 4 19.9128 4 18.6667V10Z" />
    <path d="M20 18H9C8.05719 18 7.58579 18 7.29289 18.2929C7 18.5858 7 19.0572 7 20V22" />
    <path d="M20 14H13C12.0572 14 11.5858 14 11.2929 14.2929C11 14.5858 11 15.0572 11 16V18" />
    <path d="M20 10H17C16.0572 10 15.5858 10 15.2929 10.2929C15 10.5858 15 11.0572 15 12V14" />
  </svg>
);

export const ChronosIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinejoin="round" className={className}>
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
    <path d="M9 9L13.0001 12.9996M16 8L11 13" />
  </svg>
);
export const LayoutAlignLeft = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 3H13C16.7712 3 18.6569 3 19.8284 4.17157C21 5.34315 21 7.22876 21 11V13C21 16.7712 21 18.6569 19.8284 19.8284C18.6569 21 16.7712 21 13 21H11C7.22876 21 5.34315 21 4.17157 19.8284C3 18.6569 3 16.7712 3 13V11C3 7.22876 3 5.34315 4.17157 4.17157C5.34315 3 7.22876 3 11 3Z" />
    <path d="M8.00488 16.0049L8.00488 8.00488" />
  </svg>
);

export const LayoutAlignRight = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 3H13C16.7712 3 18.6569 3 19.8284 4.17157C21 5.34315 21 7.22876 21 11V13C21 16.7712 21 18.6569 19.8284 19.8284C18.6569 21 16.7712 21 13 21H11C7.22876 21 5.34315 21 4.17157 19.8284C3 18.6569 3 16.7712 3 13V11C3 7.22876 3 5.34315 4.17157 4.17157C5.34315 3 7.22876 3 11 3Z" />
    <path d="M16 8L16 16" />
  </svg>
);

export const SettingsIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z" />
    <path d="M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z" />
  </svg>
);

export const SearchIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 17L21 21" />
    <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" />
  </svg>
);

export const CollapseIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 4L13 7.00002C13 8.88563 13.0001 9.82843 13.5858 10.4142C14.1716 11 15.1144 11 17 11L20 11" strokeMiterlimit="16" />
    <path d="M11.0001 20L11 17C11 15.1144 11 14.1715 10.4142 13.5858C9.82843 13 8.88563 13 7.00002 13L4.00006 13" strokeMiterlimit="16" />
  </svg>
);

export const ExpandIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 12L19 8.99996C19 7.11435 18.9999 6.17155 18.4142 5.58577C17.8284 4.99999 16.8856 4.99999 15 5L12 5.00001" strokeMiterlimit="16" />
    <path d="M5 12L5.00003 15C5.00004 16.8856 5.00005 17.8284 5.58584 18.4142C6.17163 19 7.11443 19 9.00004 19L12 19" strokeMiterlimit="16" />
  </svg>
);

export const ReadIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 15V9C18 6.17157 18 4.75736 17.1213 3.87868C16.2426 3 14.8284 3 12 3H8C5.17157 3 3.75736 3 2.87868 3.87868C2 4.75736 2 6.17157 2 9V15C2 17.8284 2 19.2426 2.87868 20.1213C3.75736 21 5.17157 21 8 21H20" />
    <path d="M6 8L14 8" />
    <path d="M6 12L14 12" />
    <path d="M6 16L10 16" />
    <path d="M18 8H19C20.4142 8 21.1213 8 21.5607 8.43934C22 8.87868 22 9.58579 22 11V19C22 20.1046 21.1046 21 20 21C18.8954 21 18 20.1046 18 19V8Z" />
  </svg>
);

export const WriteIcon = ({ size = 20, color, strokeWidth, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" color={color || "currentColor"} fill="none" stroke="currentColor" strokeWidth={strokeWidth || "1.5"} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5.07579 17C4.08939 4.54502 12.9123 1.0121 19.9734 2.22417C20.2585 6.35185 18.2389 7.89748 14.3926 8.61125C15.1353 9.38731 16.4477 10.3639 16.3061 11.5847C16.2054 12.4534 15.6154 12.8797 14.4355 13.7322C11.8497 15.6004 8.85421 16.7785 5.07579 17Z" />
    <path d="M4 22C4 15.5 7.84848 12.1818 10.5 10" />
  </svg>
);

export const CustomIcon = ({ name, ...props }) => {
  const icons = {
    "CollapseIcon": CollapseIcon,
    "ExpandIcon": ExpandIcon,
    "ReadIcon": ReadIcon,
    "WriteIcon": WriteIcon,
    "SettingsIcon": SettingsIcon,
    "SearchIcon": SearchIcon,
    "LayoutAlignLeft": LayoutAlignLeft,
    "LayoutAlignRight": LayoutAlignRight,
    "OpusIcon": OpusIcon,
    "CodexIcon": CodexIcon,
    "ConnexaIcon": ConnexaIcon,
    "LedgerIcon": LedgerIcon,
    "ChronosIcon": ChronosIcon,
    "TaskAdd02": TaskAdd02,
    "TimeQuarterPass": TimeQuarterPass,
    "DrawingMode": DrawingMode,
    "BorderFull": BorderFull,
    "Fire03": Fire03,
    "Layers01": Layers01,
    "ChatOutcome": ChatOutcome,
    "Undo03": Undo03,
    "Clock01": Clock01,
    "Search01": Search01,
    "CheckmarkSquare02StrokeRounded": CheckmarkSquare02StrokeRounded,
    "Upload05": Upload05,
    "PlusSignSquare": PlusSignSquare,
    "ChartLineData01": ChartLineData01,
    "Archive": Archive,
    "TaskAdd01": TaskAdd01,
    "DiscoverSquare": DiscoverSquare,
    "Settings01": Settings01,
    "Home01": Home01,
    "Calendar03": Calendar03,
    "NanoTechnology": NanoTechnology,
    "Circle": Circle,
    "DashedLineCircle": DashedLineCircle,
    "GitFork": GitFork,
    "AiBrain01": AiBrain01,
    "File02": File02,
    "TaskRemove01": TaskRemove01,
    "Structure05": Structure05,
    "File01": File01,
    "TaskRemove02": TaskRemove02,
    "Briefcase08": Briefcase08,
    "Blockchain03": Blockchain03,
    "Star": Star,
    "Setting06": Setting06,
    "Pin": Pin,
    "Folder01": Folder01,
    "CheckmarkSquare02": CheckmarkSquare02,
    "Structure04": Structure04,
    "Link01": Link01,
    "Target02": Target02,
    "AiMagic": AiMagic,
    "FolderLinks": FolderLinks,
    "DashedLine02": DashedLine02,
    "FilterHorizontal": FilterHorizontal,
    "Pen01": Pen01,
    "Share01": Share01,
    "Home08": Home08,
    "Globe02": Globe02,
    "Filter": Filter,
    "DatabaseExport": DatabaseExport,
    "LeftToRightListBullet": LeftToRightListBullet,
    "Link04": Link04,
    "Wrench01": Wrench01,
    "CheckmarkCircle02": CheckmarkCircle02,
    "JusticeScale01": JusticeScale01,
    "Delete01": Delete01,
    "StickyNote03": StickyNote03,
    "Unavailable": Unavailable,
    "Undo": Undo,
    "NotepadTextDashed": NotepadTextDashed,
    "Calendar04": Calendar04,
    "UploadSquare01": UploadSquare01,
    "FileLink": FileLink,
    "BalanceScale": BalanceScale,
    "FolderAdd": FolderAdd,
    "CancelSquare": CancelSquare,
    "Book02": Book02,
    "FolderLibrary": FolderLibrary,
    "Flag02": Flag02,
    "Global": Global,
    "ArrowDown01": ArrowDown01,
    "ArrowUp01": ArrowUp01,
    "ChevronRight": ChevronRight,
  };
  const Component = icons[name];
  return Component ? <Component {...props} /> : null;
};
