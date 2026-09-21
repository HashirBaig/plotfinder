import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type PropsWithChildren = {
  children: ReactNode;
  classnames?: string;
};

function Wrapper({ children, classnames }: PropsWithChildren) {
  return (
    <div
      className={cn(
        "bg-gray-950 w-full text-gray-100 px-8 py-4 relative",
        classnames,
      )}
    >
      {children}
    </div>
  );
}

export default Wrapper;
