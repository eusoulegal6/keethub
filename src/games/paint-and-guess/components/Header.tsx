import { Paintbrush2 } from "lucide-react";

export const Header = () => {
  return (
    <header className="w-full bg-gradient-to-r from-primary to-secondary py-6 shadow-medium">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3">
          <Paintbrush2 className="w-8 h-8 text-primary-foreground" />
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
            Draw & Guess
          </h1>
        </div>
        <p className="text-center text-primary-foreground/90 mt-2 text-sm md:text-base">
          Create amazing drawings and let others guess what they are!
        </p>
      </div>
    </header>
  );
};
