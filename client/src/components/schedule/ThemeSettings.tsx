import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Settings, Palette, Moon, Sun, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemePreset {
  primary: string;
  variant: "professional" | "tint" | "vibrant";
  appearance: "light" | "dark" | "system";
}

interface ThemePresets {
  [key: string]: ThemePreset;
}

const presets: ThemePresets = {
  sunrise: {
    primary: "hsl(24, 100%, 50%)",
    variant: "professional",
    appearance: "light"
  },
  ocean: {
    primary: "hsl(200, 100%, 50%)",
    variant: "tint",
    appearance: "light"
  },
  forest: {
    primary: "hsl(150, 100%, 40%)",
    variant: "professional",
    appearance: "light"
  },
  midnight: {
    primary: "hsl(250, 100%, 60%)",
    variant: "vibrant",
    appearance: "dark"
  }
};

const presetNames = {
  sunrise: "日出橙",
  ocean: "海洋蓝",
  forest: "森林绿",
  midnight: "午夜紫"
};

export function ThemeSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState("sunrise");
  const [currentAppearance, setCurrentAppearance] = useState<"light" | "dark" | "system">("light");

  const handlePresetChange = async (preset: string) => {
    setCurrentPreset(preset);
    const response = await fetch("/api/theme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(presets[preset]),
    });

    if (!response.ok) {
      console.error("Failed to update theme");
    }

    // 重新加载页面以应用新主题
    window.location.reload();
  };

  const handleAppearanceChange = async (appearance: "light" | "dark" | "system") => {
    setCurrentAppearance(appearance);
    const response = await fetch("/api/theme/appearance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appearance }),
    });

    if (!response.ok) {
      console.error("Failed to update appearance");
    }

    // 重新加载页面以应用新主题
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 px-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            主题设置
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">预设主题</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([key, preset]) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    "group relative p-4 rounded-lg border-2 transition-all duration-200",
                    currentPreset === key
                      ? "border-orange-500 bg-orange-50"
                      : "border-transparent hover:border-orange-200 hover:bg-orange-50/50"
                  )}
                >
                  <div className="space-y-2">
                    <div
                      className="w-full h-2 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="text-sm font-medium">{presetNames[key]}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">外观模式</h4>
            <RadioGroup
              value={currentAppearance}
              onValueChange={(value) => 
                handleAppearanceChange(value as "light" | "dark" | "system")
              }
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="light"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-transparent p-4 hover:bg-orange-50/50 hover:border-orange-200 transition-all duration-200",
                  currentAppearance === "light" && "border-orange-500 bg-orange-50"
                )}
              >
                <Sun className="h-5 w-5 mb-2" />
                <RadioGroupItem value="light" id="light" className="sr-only" />
                浅色
              </Label>
              <Label
                htmlFor="dark"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-transparent p-4 hover:bg-orange-50/50 hover:border-orange-200 transition-all duration-200",
                  currentAppearance === "dark" && "border-orange-500 bg-orange-50"
                )}
              >
                <Moon className="h-5 w-5 mb-2" />
                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                深色
              </Label>
              <Label
                htmlFor="system"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-transparent p-4 hover:bg-orange-50/50 hover:border-orange-200 transition-all duration-200",
                  currentAppearance === "system" && "border-orange-500 bg-orange-50"
                )}
              >
                <Monitor className="h-5 w-5 mb-2" />
                <RadioGroupItem value="system" id="system" className="sr-only" />
                跟随系统
              </Label>
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
