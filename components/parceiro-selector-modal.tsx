"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Parceiro {
  CODPARC: number;
  NOMEPARC: string;
  CGC_CPF: string;
}

interface ParceiroSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (parceiro: Parceiro) => void;
  titulo?: string;
}

export function ParceiroSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Selecionar Parceiro"
}: ParceiroSelectorModalProps) {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const buscarParceiros = async (termo: string) => {
    if (termo.length < 2) {
      setParceiros([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sankhya/parceiros/search?busca=${encodeURIComponent(termo)}&limite=20`);
      if (!response.ok) {
        throw new Error("Falha ao buscar parceiros.");
      }
      const data = await response.json();
      setParceiros(data.parceiros || []);
    } catch (error) {
      console.error("Erro ao buscar parceiros:", error);
      toast.error("Erro ao buscar parceiros.");
      setParceiros([]);
    } finally {
      setIsLoading(false);
    }
  };

  const buscarParceirosComDebounce = (() => {
    let timer: NodeJS.Timeout;
    return (termo: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        buscarParceiros(termo);
      }, 500);
    };
  })();

  const handleSelecionarParceiro = (parceiro: Parceiro) => {
    onConfirm(parceiro);
    onClose();
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setParceiros([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite o nome ou CNPJ/CPF do parceiro..."
            onChange={(e) => {
              setSearchTerm(e.target.value);
              buscarParceirosComDebounce(e.target.value);
            }}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Buscando parceiros...</span>
            </div>
          ) : parceiros.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchTerm.length < 2 ? "Digite pelo menos 2 caracteres para buscar." : "Nenhum parceiro encontrado."}
            </div>
          ) : (
            parceiros.map((parceiro) => (
              <Card
                key={parceiro.CODPARC}
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSelecionarParceiro(parceiro)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{parceiro.NOMEPARC}</p>
                  <p className="text-xs text-muted-foreground">
                    Cód: {parceiro.CODPARC} | Doc: {parceiro.CGC_CPF || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
