import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { n8n } from "@/lib/n8n";
import { CreditCard, DollarSign, FileText, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface BillingManagerProps {
  siteSlug: string;
  vipPin?: string;
}

interface PaymentInfo {
  client?: {
    id: string;
    site_slug: string;
    email: string;
    name: string;
    plan: string;
    status: string;
    last_payment?: string;
    payment_amount?: number;
    created_at: string;
  };
  payments?: Array<{
    payment_id: string;
    amount_paid: number;
    status: string;
    payment_date: string;
    payment_method: string;
    description?: string;
    created_at: string;
  }>;
  error?: string;
}

export default function BillingManager({ siteSlug, vipPin }: BillingManagerProps) {
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  
  // Form state
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceMethod, setInvoiceMethod] = useState("pix");
  const [invoiceDescription, setInvoiceDescription] = useState("");

  useEffect(() => {
    loadPaymentInfo();
  }, [siteSlug]);

  const loadPaymentInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await n8n.getPaymentInfo({ siteSlug });
      
      // Normalizar resposta do n8n para o formato esperado
      if (result.success && result.client) {
        setPaymentInfo({
          client: {
            id: result.client.siteSlug || '',
            site_slug: result.client.siteSlug || siteSlug,
            email: result.client.email || '',
            name: result.client.name || '',
            plan: result.client.plan || 'essential',
            status: result.client.status || 'active',
            last_payment: result.payment?.lastPayment?.date || null,
            payment_amount: result.payment?.lastPayment?.amount || 0,
            created_at: new Date().toISOString()
          },
          payments: result.history?.map((p: any) => ({
            payment_id: p.id || '',
            amount_paid: p.amount || 0,
            status: p.status || 'pending',
            payment_date: p.date || '',
            payment_method: p.method || 'pix',
            description: p.description || '',
            created_at: p.date || new Date().toISOString()
          })) || []
        });
      } else if (result.client) {
        // Formato alternativo (dados diretos)
        setPaymentInfo(result as PaymentInfo);
      } else {
        throw new Error(result.error || result.message || 'Erro ao carregar informações');
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar informações de pagamento");
      console.error("Erro ao carregar payment info:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceAmount || parseFloat(invoiceAmount) <= 0) {
      setError("Valor inválido");
      return;
    }

    setCreatingInvoice(true);
    setError(null);
    try {
      const result = await n8n.createInvoice({
        siteSlug,
        amount: parseFloat(invoiceAmount),
        dueDate: invoiceDueDate || undefined,
        paymentMethod: invoiceMethod,
        description: invoiceDescription || undefined,
      });

      if (result.success) {
        setShowInvoiceDialog(false);
        setInvoiceAmount("");
        setInvoiceDueDate("");
        setInvoiceDescription("");
        await loadPaymentInfo(); // Recarregar informações
        alert("Fatura criada com sucesso!");
      } else {
        throw new Error(result.error || "Erro ao criar fatura");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao criar fatura");
      console.error("Erro ao criar fatura:", err);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid" || statusLower === "pago") {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    if (statusLower === "pending" || statusLower === "pendente") {
      return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    if (statusLower === "overdue" || statusLower === "vencido") {
      return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Vencido</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400">Carregando informações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Faturamento
          </CardTitle>
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                Criar Fatura
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Criar Nova Fatura</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Preencha os dados para criar uma nova fatura
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Método de Pagamento</Label>
                  <select
                    id="method"
                    value={invoiceMethod}
                    onChange={(e) => setInvoiceMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="transferencia">Transferência Bancária</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={invoiceDescription}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Descrição da fatura..."
                    rows={3}
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-sm">{error}</div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowInvoiceDialog(false)}
                    disabled={creatingInvoice}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creatingInvoice ? "Criando..." : "Criar Fatura"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}

        {paymentInfo?.client && (
          <div className="space-y-4">
            {/* Informações do Cliente */}
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Informações do Cliente
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Plano:</span>
                  <span className="text-white ml-2 font-medium">{paymentInfo.client.plan}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white ml-2">{getStatusBadge(paymentInfo.client.status)}</span>
                </div>
                {paymentInfo.client.last_payment && (
                  <div>
                    <span className="text-slate-400">Último Pagamento:</span>
                    <span className="text-white ml-2">{formatDate(paymentInfo.client.last_payment)}</span>
                  </div>
                )}
                {paymentInfo.client.payment_amount && (
                  <div>
                    <span className="text-slate-400">Valor:</span>
                    <span className="text-white ml-2 font-medium">
                      {formatCurrency(paymentInfo.client.payment_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Pagamentos */}
            {paymentInfo.payments && paymentInfo.payments.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Pagamentos
                </h3>
                <div className="space-y-2">
                  {paymentInfo.payments.map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            {formatCurrency(payment.amount_paid)}
                          </span>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="text-sm text-slate-400">
                          {payment.description || "Sem descrição"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(payment.payment_date)} • {payment.payment_method}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!paymentInfo.payments || paymentInfo.payments.length === 0) && (
              <div className="text-slate-400 text-sm text-center py-4">
                Nenhum pagamento registrado ainda
              </div>
            )}
          </div>
        )}

        {!paymentInfo?.client && !error && (
          <div className="text-slate-400 text-sm text-center py-4">
            Nenhuma informação de pagamento encontrada
          </div>
        )}
      </CardContent>
    </Card>
  );
}

