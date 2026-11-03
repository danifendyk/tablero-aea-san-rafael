'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { finiteNumber } from '@/lib/project-data';
import {
  circuitApparentPower,
  circuitActivePower,
  circuitPointCount,
  mixedLoadVA,
  MUNICIPAL_CIRCUIT_REFERENCE_URL,
  type MixedLoad,
} from '@/lib/circuit-loads';

export function MixedCircuitEditor({
  name,
  loads,
  onChange,
}: {
  name: string;
  loads: MixedLoad[];
  onChange: (loads: MixedLoad[]) => void;
}) {
  const fieldId = useId();
  const input = { kind: 'MIX', points: 0, unitVA: 0, mixedLoads: loads };
  const power = circuitApparentPower(input);
  const number = (value: number, digits = 2) =>
    value.toLocaleString('es-AR', { maximumFractionDigits: digits });
  const update = (index: number, patch: Partial<MixedLoad>) =>
    onChange(
      loads.map((load, i) => (i === index ? { ...load, ...patch } : load)),
    );
  return (
    <section
      aria-label={`Cargas del mixto ${name}`}
      className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 dark:bg-sky-950/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{name} · Mixto</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Iluminación y tomacorrientes comparten una salida y una protección.
            Cargá cada grupo por separado.
          </p>
        </div>
        <div className="flex gap-2">
          {(['lighting', 'socket'] as const).map((kind) => (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              disabled={loads.length >= 100}
              onClick={() =>
                onChange([
                  ...loads,
                  {
                    name:
                      kind === 'lighting' ? 'Iluminación' : 'Tomacorrientes',
                    kind,
                    points: 1,
                    unitPower: kind === 'lighting' ? 20 : 220,
                    unit: kind === 'lighting' ? 'W' : 'VA',
                    powerFactor: kind === 'lighting' ? 0.9 : 1,
                  },
                ])
              }
            >
              + {kind === 'lighting' ? 'Iluminación' : 'Tomacorrientes'}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loads.map((load, index) => {
          const label = `${name}, carga ${index + 1}`;
          return (
            <fieldset
              key={index}
              className="rounded-lg border bg-background p-3"
            >
              <legend className="px-1 text-xs font-semibold">
                Carga {index + 1} ·{' '}
                {load.kind === 'lighting' ? 'Iluminación' : 'Tomacorrientes'}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1.5fr)_140px_80px_110px_80px_90px_auto]">
                <label htmlFor={`${fieldId}-${index}-name`} className="text-xs">
                  Descripción
                  <Input
                    id={`${fieldId}-${index}-name`}
                    aria-label={`Descripción de ${label}`}
                    value={load.name}
                    maxLength={200}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </label>
                <label htmlFor={`${fieldId}-${index}-kind`} className="text-xs">
                  Uso
                  <NativeSelect
                    id={`${fieldId}-${index}-kind`}
                    aria-label={`Uso de ${label}`}
                    className="w-full"
                    value={load.kind}
                    onChange={(e) =>
                      update(index, {
                        kind: e.target.value as MixedLoad['kind'],
                      })
                    }
                  >
                    <NativeSelectOption value="lighting">
                      Iluminación
                    </NativeSelectOption>
                    <NativeSelectOption value="socket">
                      Tomacorrientes
                    </NativeSelectOption>
                  </NativeSelect>
                </label>
                <label
                  htmlFor={`${fieldId}-${index}-points`}
                  className="text-xs"
                >
                  Bocas
                  <Input
                    id={`${fieldId}-${index}-points`}
                    aria-label={`Bocas de ${label}`}
                    type="number"
                    min={0}
                    step={1}
                    value={load.points}
                    onChange={(e) =>
                      update(index, {
                        points: Math.round(
                          finiteNumber(e.target.value, 0, 0, 10000),
                        ),
                      })
                    }
                  />
                </label>
                <label
                  htmlFor={`${fieldId}-${index}-power`}
                  className="text-xs"
                >
                  Potencia por boca
                  <Input
                    id={`${fieldId}-${index}-power`}
                    aria-label={`Potencia por boca de ${label}`}
                    type="number"
                    min={0}
                    step="any"
                    value={load.unitPower}
                    onChange={(e) =>
                      update(index, {
                        unitPower: finiteNumber(e.target.value, 0, 0, 1e9),
                      })
                    }
                  />
                </label>
                <label htmlFor={`${fieldId}-${index}-unit`} className="text-xs">
                  Unidad
                  <NativeSelect
                    id={`${fieldId}-${index}-unit`}
                    aria-label={`Unidad de ${label}`}
                    className="w-full"
                    value={load.unit}
                    onChange={(e) => {
                      const unit = e.target.value as MixedLoad['unit'];
                      update(index, {
                        unit,
                        unitPower:
                          load.unitPower *
                          (unit === 'W'
                            ? load.powerFactor
                            : 1 / load.powerFactor),
                      });
                    }}
                  >
                    <NativeSelectOption value="W">W</NativeSelectOption>
                    <NativeSelectOption value="VA">VA</NativeSelectOption>
                  </NativeSelect>
                </label>
                <label htmlFor={`${fieldId}-${index}-fp`} className="text-xs">
                  Factor de potencia
                  <Input
                    id={`${fieldId}-${index}-fp`}
                    aria-label={`Factor de potencia de ${label}`}
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.01}
                    value={load.powerFactor}
                    onChange={(e) =>
                      update(index, {
                        powerFactor: finiteNumber(
                          e.target.value,
                          load.powerFactor,
                          0.1,
                          1,
                        ),
                      })
                    }
                  />
                </label>
                <div className="flex items-end gap-2">
                  <span className="pb-2 text-xs font-mono">
                    {number(mixedLoadVA(load))} VA
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Eliminar ${label}`}
                    onClick={() =>
                      onChange(loads.filter((_, i) => i !== index))
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-semibold">
        {circuitPointCount(input)} bocas · {number(power)} VA ·{' '}
        {number(circuitActivePower(input))} W · Ib = {number(power / 220)} A a
        220 V
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        W se convierte a VA usando el FP de cada carga. Se suman las potencias
        aparentes sin descontar simultaneidad. Distribución mínima: 2,5 mm²; los
        retornos requieren su propia verificación.{' '}
        <a
          className="underline"
          href={MUNICIPAL_CIRCUIT_REFERENCE_URL}
          target="_blank"
          rel="noreferrer"
        >
          Ord. 72/83, III.2.8.3.3
        </a>
        : hasta 15 bocas, protección ≤15 A y carga total ≤6 A. Verificá el
        encuadre del expediente.
      </p>
    </section>
  );
}
