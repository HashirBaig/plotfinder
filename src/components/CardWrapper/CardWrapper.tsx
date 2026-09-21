import type { ReactNode } from "react";

type PropsWithChildren = {
  children: ReactNode;
};

function CardWrapper({ children }: PropsWithChildren) {
  return <div className="bg-gray-900 p-5 rounded-xl">{children}</div>;
}

export default CardWrapper;
