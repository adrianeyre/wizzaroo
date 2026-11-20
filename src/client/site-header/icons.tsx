import type { ReactNode } from "react";
import type { RegionLandmark } from "../../curriculum/world-map.js";

const StrokeIcon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const MenuIcon = () => (
  <StrokeIcon>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </StrokeIcon>
);

export const ChevronDownIcon = () => (
  <StrokeIcon>
    <path d="m6 9 6 6 6-6" />
  </StrokeIcon>
);

export const CogIcon = () => (
  <StrokeIcon>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </StrokeIcon>
);

export const ChildrenIcon = () => (
  <StrokeIcon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </StrokeIcon>
);

export const FamilyDevicesIcon = () => (
  <StrokeIcon>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M8 21h8M12 18v3" />
  </StrokeIcon>
);

export const InviteIcon = () => (
  <StrokeIcon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </StrokeIcon>
);

export const AccountIcon = () => (
  <StrokeIcon>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M8.5 16a4 4 0 0 1 7 0" />
  </StrokeIcon>
);

export const ThisDeviceIcon = () => (
  <StrokeIcon>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M11 18h2" />
  </StrokeIcon>
);

export const HomeIcon = () => (
  <StrokeIcon>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </StrokeIcon>
);

export const ParentsIcon = () => (
  <StrokeIcon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </StrokeIcon>
);

export const SignInIcon = () => (
  <StrokeIcon>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5M15 12H3" />
  </StrokeIcon>
);

export const SignOutIcon = () => (
  <StrokeIcon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </StrokeIcon>
);

export const SystemModeIcon = () => (
  <StrokeIcon>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </StrokeIcon>
);

export const LightModeIcon = () => (
  <StrokeIcon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </StrokeIcon>
);

export const DarkModeIcon = () => (
  <StrokeIcon>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </StrokeIcon>
);

export const CheckIcon = () => (
  <StrokeIcon>
    <path d="M20 6 9 17l-5-5" />
  </StrokeIcon>
);

export const MapIcon = () => (
  <StrokeIcon>
    <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </StrokeIcon>
);

export const LockIcon = () => (
  <StrokeIcon>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </StrokeIcon>
);

export const UnlockIcon = () => (
  <StrokeIcon>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.75-1.4" />
  </StrokeIcon>
);

export const StarIcon = () => (
  <StrokeIcon>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </StrokeIcon>
);

export const BubblesIcon = () => (
  <StrokeIcon>
    <circle cx="9" cy="14" r="6" />
    <circle cx="17.5" cy="6.5" r="3.5" />
    <path d="M6.5 12a3 3 0 0 1 2.5-2" />
  </StrokeIcon>
);

export const ForestIcon = () => (
  <StrokeIcon>
    <path d="M12 2 5 12h4l-3 5h12l-3-5h4z" />
    <path d="M12 17v5" />
  </StrokeIcon>
);

export const CrystalsIcon = () => (
  <StrokeIcon>
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M2 9h20M10 3 8 9l4 12 4-12-2-6" />
  </StrokeIcon>
);

export const MusicIcon = () => (
  <StrokeIcon>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </StrokeIcon>
);

export const BigTopIcon = () => (
  <StrokeIcon>
    <path d="M12 2v3" />
    <path d="M12 2l4 1.5L12 5" />
    <path d="M3 13 12 5l9 8" />
    <path d="M4 13v8h16v-8" />
    <path d="M8 13l-1 8M16 13l1 8M12 13v8" />
    <path d="M3 13c1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0" />
  </StrokeIcon>
);

export const TrophyIcon = () => (
  <StrokeIcon>
    <path d="M8 21h8M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </StrokeIcon>
);

export const GlobeIcon = () => (
  <StrokeIcon>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </StrokeIcon>
);

export const HourglassIcon = () => (
  <StrokeIcon>
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </StrokeIcon>
);

export const PaletteIcon = () => (
  <StrokeIcon>
    <path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2.5a2 2 0 0 0-1.5 3.3c.6.7.2 2.7-2 2.7z" />
    <circle cx="13.5" cy="6.5" r="1" />
    <circle cx="17.5" cy="10.5" r="1" />
    <circle cx="8.5" cy="7.5" r="1" />
    <circle cx="6.5" cy="12.5" r="1" />
  </StrokeIcon>
);

export const ToolsIcon = () => (
  <StrokeIcon>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
  </StrokeIcon>
);

export const LanguagesIcon = () => (
  <StrokeIcon>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </StrokeIcon>
);

export const CastleIcon = () => (
  <StrokeIcon>
    <path d="M3 21V8h3v3h3V8h2V4h2v4h2v3h3V8h3v13z" />
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
  </StrokeIcon>
);

export const SpireIcon = () => (
  <StrokeIcon>
    <path d="M12 2v3" />
    <path d="M9.5 5h5L16 21H8z" />
    <path d="M5 21h14" />
    <path d="M10.5 10h3M10 15h4" />
  </StrokeIcon>
);

export const DownloadIcon = () => (
  <StrokeIcon>
    <path d="M12 3v12m0 0-4-4m4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </StrokeIcon>
);

export const KeyIcon = () => (
  <StrokeIcon>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2" />
  </StrokeIcon>
);

export const SearchIcon = () => (
  <StrokeIcon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </StrokeIcon>
);

export const PlusIcon = () => (
  <StrokeIcon>
    <path d="M12 5v14M5 12h14" />
  </StrokeIcon>
);

export const ChevronLeftIcon = () => (
  <StrokeIcon>
    <path d="m15 18-6-6 6-6" />
  </StrokeIcon>
);

export const ChevronRightIcon = () => (
  <StrokeIcon>
    <path d="m9 18 6-6-6-6" />
  </StrokeIcon>
);

export const FirstPageIcon = () => (
  <StrokeIcon>
    <path d="m17 18-6-6 6-6M7 6v12" />
  </StrokeIcon>
);

export const LastPageIcon = () => (
  <StrokeIcon>
    <path d="m7 18 6-6-6-6M17 6v12" />
  </StrokeIcon>
);

export const CloseIcon = () => (
  <StrokeIcon>
    <path d="M18 6 6 18M6 6l12 12" />
  </StrokeIcon>
);

export const MailIcon = () => (
  <StrokeIcon>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </StrokeIcon>
);

export const UserOffIcon = () => (
  <StrokeIcon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m17 8 5 5M22 8l-5 5" />
  </StrokeIcon>
);

export const PencilIcon = () => (
  <StrokeIcon>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    <path d="m15 5 4 4" />
  </StrokeIcon>
);

export const EyeIcon = () => (
  <StrokeIcon>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </StrokeIcon>
);

export const ArrowRightIcon = () => (
  <StrokeIcon>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </StrokeIcon>
);

export const TrashIcon = () => (
  <StrokeIcon>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
  </StrokeIcon>
);

export const CopyIcon = () => (
  <StrokeIcon>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </StrokeIcon>
);

export const CoinsIcon = () => (
  <StrokeIcon>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4" />
  </StrokeIcon>
);

export const UploadIcon = () => (
  <StrokeIcon>
    <path d="M12 15V3m0 0L8 7m4-4 4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </StrokeIcon>
);

export const regionLandmarkIcons: Record<RegionLandmark, ReactNode> = {
  bubbles: <BubblesIcon />,
  forest: <ForestIcon />,
  crystals: <CrystalsIcon />,
  castle: <CastleIcon />,
  music: <MusicIcon />,
  spire: <SpireIcon />,
  "big-top": <BigTopIcon />,
  globe: <GlobeIcon />,
  hourglass: <HourglassIcon />,
  easel: <PaletteIcon />,
  workshop: <ToolsIcon />,
  embassy: <LanguagesIcon />,
  "challenge-arena": <TrophyIcon />,
};
