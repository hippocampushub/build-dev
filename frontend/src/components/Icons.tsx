import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </Icon>
);
export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
  </Icon>
);
export const ExternalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="M22 2 11 13" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12 5 5L20 7" />
  </Icon>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const FileIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
    <path d="M14 3v4h4" />
  </Icon>
);
/** HH Neuron Builder: the central pyramidal neuron of the home page banner, traced from its image. */
export const BuilderIcon = (p: IconProps) => (
  <Icon strokeWidth={1} {...p}>
    <path d="M14.4 17.8 14.5 15.7M14.5 15.7 14.2 15.6M14.2 15.6 14.3 15.2M14.3 15.2 13.6 14.8M13.6 14.8 13.4 14.8M13.6 14.8 14.1 14 13.1 12.9M13.1 12.9 12.3 12.6M13.1 12.9 12.9 11.3M12.9 11.3 12.5 11.1 12.8 10M12.8 10 12.7 9.5M12.7 9.5 12.5 9.4M12.7 9.5 13.1 9.2 12.8 8.3 13.2 8.2 13.3 6.8M13.3 6.8 12.7 5.9M12.7 5.9 10.9 4.7 12 3.5 10.7 2.7M10.7 2.7 9 1.6 6.2 1 4.5 1.2M10.7 2.7 8.9 2.6 6.6 1.5M12.7 5.9 13.3 5.4M13.3 5.4 12.6 4.9 13.4 4.1 13 3.4M13.3 5.4 17.8 3.4 18.2 2.8 20.3 2.5M13.3 6.8 13.9 6.7 13.6 5.9 14.3 5.4M14.3 5.4 18.5 3.5M14.3 5.4 16.2 5.2M12.8 10 12.7 10.1M12.9 11.3 15 9.2M14.3 15.2 15.8 14.5 16 13.6 16.9 12.5M14.2 15.6 13.3 15.4M14.5 15.7 15 15.6M15 15.6 16.6 15M15 15.6 16.8 15.3M14.4 17.8 14.3 18.5M14.3 18.5 13.7 18.7M13.7 18.7 11.1 19.3M13.7 18.7 13.5 19.3 11.7 19.7 10.7 20.7M10.7 20.7 10.1 20.7M10.1 20.7 8.6 20.8 5.2 22.7 3.7 23M10.1 20.7 9.4 21.3M10.7 20.7 10.7 21.1M14.3 18.5 14.5 18.6M14.5 18.6 17 18.9M17 18.9 17.4 18.9M17 18.9 17.5 19.3M17.5 19.3 18.6 20.2M17.5 19.3 18.4 20.4M14.5 18.6 14.7 19.3M14.7 19.3 12.8 21.1M12.8 21.1 12.3 21.5M12.8 21.1 12.9 21.4M14.7 19.3 15 19.6M15 19.6 15.7 20.1M15 19.6 14.7 20.8M14.7 20.8 14.6 20.9M14.7 20.8 15.2 21.3 14.7 21.9" />
    <circle cx="14.4" cy="17.8" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);
export const NeuronIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 9V3m0 12v6M9.5 10.5 4 6m10.5 4.5L20 6M9.5 13.5 5 18m9.5-4.5L19 18M4 6l-1 3m17-3 1 3" />
  </Icon>
);
export const TraceIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 14h4l2-8 3 14 3-10 2 4h6" />
  </Icon>
);
export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5v14" />
    <path d="M15 5v14" />
  </Icon>
);
export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" />
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </Icon>
);
