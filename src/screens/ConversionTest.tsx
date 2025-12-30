import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "أهلاً بك! 💜",
        description: "تم تسجيل الدخول بنجاح",
      });
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">تسجيل الدخول</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">مرحباً بعودتك</CardTitle>
            <CardDescription className="text-center">
              سجلي الدخول لمتابعة حجوزاتك واشتراكك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-left">
                <button 
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => toast({ title: "سيتم إضافة هذه الميزة قريباً" })}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? "جاري التحميل..." : "تسجيل الدخول"}
              </Button>

              {/* Register Link */}
              <p className="text-center text-sm text-muted-foreground">
                ليس لديك حساب؟{" "}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => navigate("/register")}
                >
                  إنشاء حساب جديد
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;