# Baile da Lagoa — novidades do painel

Resumo objetivo do que mudou no sistema de ingressos (site + painel admin).

## Para quem compra
- **Endereço público**: site, e-mails e mensagens já mostram Av. Gen. Motors, 1159 - Ronda (sem "local secreto").
- **Bar**: todas as menções a "open bar" viraram "1 drink incluso · bar sem álcool".
- **Ingresso em PDF**: quem paga recebe o e-mail com o QR Code na tela **e um PDF anexo** para salvar no celular e apresentar na portaria.

## Para a equipe (painel admin)
- **Celular**: painel reorganizado para o celular — menu flutuante no rodapé e lista em cartões, sem rolagem lateral.
- **Ingresso cortesia**: botão "Cortesia" emite um ingresso gratuito (código `BDL-C-…`), envia por e-mail com PDF e tem mensagem pronta de WhatsApp. Não ocupa vaga de lote nem entra na receita.
- **Novo prazo de pagamento**: para quem deixou o prazo vencer, basta selecionar (um ou vários) e definir um novo prazo; o link de compra volta a funcionar.
- **Painel de cada participante**: tocando no nome abre a ficha completa — código do ingresso, lote, valor pago, comprovante, linha do tempo (cadastro → liberação → prazo → pagamento → check-in), observações internas, reenvio do ingresso, PDF, cancelar/reativar ingresso.
- **Check-in visível**: selo "ENTROU hh:mm" na lista, filtro "já entrou / sem check-in" e contador **"Na festa X / Y"** ao vivo na portaria.
- **Receita**: card "Arrecadado" + ticket médio na lista; na aba Métricas, arrecadação total, por lote e por dia; alerta de pagamento com valor divergente.
- **Reservas em andamento**: na aba Lotes, quem está com o Pix aberto neste minuto e quantos minutos restam.
- **Filtros novos**: expirados (prazo vencido), vencem em 2h (para mandar WhatsApp na hora certa), cortesias, origem dinâmica, ordenações (pagos primeiro, prazo mais próximo, mais recentes) e busca por código do ingresso.
- **Aba Logs + cota de e-mails**: o painel mostra quantos e-mails ainda podem sair no dia (limite do Resend) e trava a liberação de lote para não estourar; erros de envio (ex.: ingresso que não chegou) ficam registrados para conferência.
- **Senha só da portaria**: a equipe da entrada pode usar uma senha própria que abre apenas o check-in (sem aprovar pagamento, excluir ou liberar lotes).
- **Proteções**: aprovar pagamento na mão pede confirmação e gera código `BDL-M-…`; quem já tem ingresso não pode ser excluído (só cancelado).

## O que precisa ser feito para ativar
1. Rodar os blocos novos do `supabase/schema.sql` no Supabase (colunas `ticket_kind`/`courtesy_note`, função `check_in_ticket`, seção 7 cortesia e, se ainda não rodou, seção 6 logs).
2. `npm install` (nova dependência de PDF) e deploy.
3. Na hospedagem: `ADMIN_PASSWORD` forte e, opcional, `ADMIN_CHECKIN_PASSWORD` para a portaria; chave do Resend com "full access" para o contador de cota funcionar.
