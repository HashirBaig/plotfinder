import BoyImage from "@/assets/boy_waving.png";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import "./contact-card.css";

function ContactCard() {
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;
    let showTimeout: ReturnType<typeof setTimeout>;

    const showCardCycle = () => {
      setShowCard(true);

      // Card/animation stays for 7 seconds
      hideTimeout = setTimeout(() => {
        setShowCard(false);

        // Reappear 21 seconds after disappearing
        showTimeout = setTimeout(() => {
          showCardCycle();
        }, 35000);
      }, 7000);
    };

    // First appearance after 7 seconds
    const initialTimeout = setTimeout(() => {
      showCardCycle();
    }, 7000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(showTimeout);
    };
  }, []);

  if (!showCard) return null;

  return (
    <div
      className="
        fixed
        z-1200
        bottom-6
        right-6
        flex
        items-center
        gap-3
        border-2
        border-gray-100/5
        bg-gray-900
        rounded-2xl
        px-4
        shadow-2xl
        animate-contact-card
      "
    >
      <img src={BoyImage} alt="Boy waving" className="w-40 h-auto" />

      <div className="flex flex-col justify-center items-center">
        <h1 className="text-center font-semibold">
          Like what you see?! Get in touch.
          <br />
          Let's build together!
        </h1>

        <Button
          variant="link"
          onClick={() => {
            const email = "hashirbaig57@gmail.com";
            const subject = encodeURIComponent("Getting in touch");

            window.location.href = `mailto:${email}?subject=${subject}`;
          }}
        >
          Contact me
          <Mail className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default ContactCard;
