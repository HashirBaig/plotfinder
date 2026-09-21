import { useUserStore } from "@/store/userStore";
import { useMemo } from "react";

function Hero() {
  const username = useUserStore((state) => state.username);

  const userInitials = useMemo(() => {
    if (!username) return "";

    const parts = username.split("-");
    const first = parts[0]?.charAt(0).toUpperCase() ?? "";
    const second = parts[1]?.charAt(0).toUpperCase() ?? "";

    return `${first}${second}`;
  }, [username]);

  return (
    <header className="flex items-center justify-end">
      <div className="p-2 cursor-pointer border-3 bg-blue-800/70 border-blue-800/70 rounded-full">
        <h1 className="text-blue-100 text-2xl font-semibold text-center">
          {userInitials}
        </h1>
      </div>
    </header>
  );
}

export default Hero;
