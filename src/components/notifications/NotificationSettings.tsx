// NotificationSettings — tela completa.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getNotifConfig, setNotifConfig, requestPermission,
  scheduleWeeklyPulse, buildWeeklyPulseContent,
  scheduleMaintenanceReminders, cancelMaintenanceReminders,
  type NotifConfig,
} from '@/lib/notifications';
import {
  getMaintenanceNotifPrefs, setMaintenanceNotifPrefs,
  type MaintenanceNotifPrefs,
} from '@/lib/compass';
import { listProjects } from '@/lib/projects';
import { GuestStorage } from '@/lib/guestStorage';
import { SilenceModeSheet } from './SilenceModeSheet';
import { SilenceModeIndicator } from './SilenceModeIndicator';

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function NotificationSettings() {
  const router = useRouter();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<NotifConfig>(getNotifConfig());
  const [maint, setMaint] = useState<MaintenanceNotifPrefs>(getMaintenanceNotifPrefs());
  const [sheet, setSheet] = useState(false);

  async function patch(p: Partial<NotifConfig>) {
    const next = setNotifConfig(p);
    setCfg(next);
  }

  async function toggleMaintenance(enabled: boolean) {
    if (enabled) await requestPermission();
    const next = setMaintenanceNotifPrefs({ enabled });
    setMaint(next);
    if (enabled) await scheduleMaintenanceReminders({ time_hour: next.time_hour });
    else await cancelMaintenanceReminders();
  }

  async function changeMaintenanceHour(hour: number) {
    const next = setMaintenanceNotifPrefs({ time_hour: hour });
    setMaint(next);
    if (next.enabled) await scheduleMaintenanceReminders({ time_hour: next.time_hour });
  }

  async function togglePulse(enabled: boolean) {
    if (enabled) await requestPermission();
    const pulse = { ...cfg.pulse, enabled };
    await patch({ pulse });
    // reconfigura agendamento com conteúdo dinâmico
    const projects = await listProjects();
    const entries = GuestStorage.getEntries();
    await scheduleWeeklyPulse(pulse, async () => buildWeeklyPulseContent(projects, entries));
  }

  async function changePulseDay(day: number) {
    const pulse = { ...cfg.pulse, day_of_week: day };
    await patch({ pulse });
    if (pulse.enabled) {
      const projects = await listProjects();
      const entries = GuestStorage.getEntries();
      await scheduleWeeklyPulse(pulse, async () => buildWeeklyPulseContent(projects, entries));
    }
  }
  async function changePulseHour(hour: number) {
    const pulse = { ...cfg.pulse, time_hour: hour };
    await patch({ pulse });
    if (pulse.enabled) {
      const projects = await listProjects();
      const entries = GuestStorage.getEntries();
      await scheduleWeeklyPulse(pulse, async () => buildWeeklyPulseContent(projects, entries));
    }
  }

  async function toggleInvite(enabled: boolean) {
    if (enabled) await requestPermission();
    await patch({ invite: { ...cfg.invite, enabled } });
  }
  async function changeInviteFreq(v: string) {
    await patch({ invite: { ...cfg.invite, frequency_days: Number(v) as 3 | 7 | 14 } });
  }

  useEffect(() => {
    setCfg(getNotifConfig());
    setMaint(getMaintenanceNotifPrefs());
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-heading text-foreground">Notificações</h1>
        </div>
      </header>

      <main className="px-4 py-5 max-w-md mx-auto space-y-6">
        <SilenceModeIndicator onChange={() => setCfg(getNotifConfig())} />

        {/* Crítica */}
        <section className="space-y-2 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-foreground">Alertas de Momento Crítico</h2>
            <Switch checked disabled />
          </div>
          <p className="text-small text-muted-foreground">
            IMV vencendo, padrões de abandono, projeto inativo. Sempre ativos.
          </p>
        </section>

        {/* Pulso semanal */}
        <section className="space-y-3 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-foreground">Pulso Semanal</h2>
            <Switch checked={cfg.pulse.enabled} onCheckedChange={togglePulse} />
          </div>
          {cfg.pulse.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-label text-muted-foreground uppercase">Dia</label>
                <Select value={String(cfg.pulse.day_of_week)} onValueChange={(v) => changePulseDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-label text-muted-foreground uppercase">Horário</label>
                <Select value={String(cfg.pulse.time_hour)} onValueChange={(v) => changePulseHour(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        {/* Lembrete de ausência de registros */}
        <section className="space-y-3 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-foreground">Lembrete - Ausências de Registros</h2>
            <Switch checked={cfg.invite.enabled} onCheckedChange={toggleInvite} />
          </div>
          <p className="text-small text-muted-foreground">
            Avisa quando um projeto fica sem registros por muito tempo.
          </p>
          {cfg.invite.enabled && (
            <div className="space-y-1">
              <label className="text-label text-muted-foreground uppercase">Frequência</label>
              <Select value={String(cfg.invite.frequency_days)} onValueChange={changeInviteFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">A cada 3 dias</SelectItem>
                  <SelectItem value="7">A cada 7 dias</SelectItem>
                  <SelectItem value="14">A cada 14 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        {/* Rotina de Manutenção */}
        <section className="space-y-3 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-foreground">Rotina de Manutenção</h2>
            <Switch checked={maint.enabled} onCheckedChange={toggleMaintenance} />
          </div>
          <p className="text-small text-muted-foreground">
            Lembretes de revisão semanal, quinzenal e mensal.
          </p>
          {maint.enabled && (
            <div className="space-y-1">
              <label className="text-label text-muted-foreground uppercase">
                Horário preferido
              </label>
              <Select
                value={String(maint.time_hour)}
                onValueChange={(v) => void changeMaintenanceHour(Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        <hr className="border-border" />

        {/* Modo silêncio */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Modo Silêncio</h2>
          <Button variant="outline" className="w-full justify-between" onClick={() => setSheet(true)}>
            Ativar Modo Silêncio
            <span aria-hidden>→</span>
          </Button>
        </section>

        <hr className="border-border" />

        {/* Pacto */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Pacto de Execução</h2>
          <p className="text-small text-muted-foreground">
            Configurado por projeto em cada Dashboard.
          </p>
          <Button
            variant="ghost"
            className="px-0 text-[color:var(--color-brand-blue)]"
            onClick={() => navigate({ to: '/panel' })}
          >
            Ver projetos com pacto ativo →
          </Button>
        </section>
      </main>

      <SilenceModeSheet
        open={sheet}
        onOpenChange={setSheet}
        onActivated={() => setCfg(getNotifConfig())}
      />
    </div>
  );
}
