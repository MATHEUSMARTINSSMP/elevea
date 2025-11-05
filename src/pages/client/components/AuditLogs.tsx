import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ComingSoonCard } from '@/components/ui/coming-soon-card'

interface AuditLogsProps {
  siteSlug: string
  vipPin: string
}

export default function AuditLogs({ siteSlug, vipPin }: AuditLogsProps) {
  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Logs de Auditoria</CardTitle>
        <CardDescription className="text-slate-400">
          Histórico de alterações e ações realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ComingSoonCard
          title="Logs de Auditoria"
          description="Em breve você poderá visualizar todas as alterações realizadas no sistema, quem fez e quando."
        />
      </CardContent>
    </Card>
  )
}

