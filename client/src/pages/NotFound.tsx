import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Info } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
            <AlertCircle className="relative h-14 w-14 text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">404</h1>
          <h2 className="text-lg font-semibold text-muted-foreground">
            Página não encontrada
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            A página que você procura não existe.
            <br />
            Ela pode ter sido movida ou excluída.
          </p>
          <Button
            onClick={handleGoHome}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
      <footer className="border-t border-border bg-card/60 backdrop-blur-md w-full">
        <div className="px-6 py-2.5 flex items-center justify-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground text-center">
            Análise baseada em dados públicos, não recomendação de compra/venda.
          </p>
        </div>
      </footer>
    </div>
  );
}
