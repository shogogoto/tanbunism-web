import { ChevronRight, RotateCcw, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { SearchByTextTanbunGetType } from "~/shared/generated/fastAPI.schemas";
import type { SearchSettings, SearchType } from "./settings";

export default function SearchSettingsPanel({
  enabledTypes,
  settings,
  onChange,
  onReset,
}: {
  enabledTypes: SearchType[];
  settings: SearchSettings;
  onChange: (settings: SearchSettings) => void;
  onReset: () => void;
}) {
  return (
    <Collapsible>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            <Settings /> 詳細設定
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-3 space-y-3 rounded-md border bg-background p-4">
        {enabledTypes.includes("knowledge") && (
          <KnowledgeSettings settings={settings} onChange={onChange} />
        )}
        {enabledTypes.includes("resource") && (
          <ResourceSettings settings={settings} onChange={onChange} />
        )}
        {enabledTypes.includes("user") && (
          <UserSettings settings={settings} onChange={onChange} />
        )}
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw /> 初期値に戻す
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

function KnowledgeSettings({ settings, onChange }: SettingsSectionProps) {
  const weights = settings.knowledge.weights;
  const weightFields = [
    ["detail", "詳細"],
    ["premise", "前提"],
    ["conclusion", "結論"],
    ["refer", "参照"],
    ["referred", "被参照"],
  ] as const;
  const weightOptions = [-1, 0, 1, 2, 3, 4, 5].map(
    (value) => [String(value), String(value)] as const,
  );
  return (
    <SettingsSection title="知識の検索条件" borderClass="border-l-blue-500">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="knowledge-match"
          label="一致方法"
          value={settings.knowledge.matchType}
          onChange={(matchType) =>
            onChange({
              ...settings,
              knowledge: {
                ...settings.knowledge,
                matchType: matchType as SearchByTextTanbunGetType,
              },
            })
          }
          options={[
            [SearchByTextTanbunGetType.CONTAINS, "部分一致"],
            [SearchByTextTanbunGetType.STARTS_WITH, "前方一致"],
            [SearchByTextTanbunGetType.ENDS_WITH, "後方一致"],
            [SearchByTextTanbunGetType.EQUAL, "完全一致"],
            [SearchByTextTanbunGetType.REGEX, "正規表現"],
          ]}
        />
        <BooleanField
          id="knowledge-desc"
          label="重要度の高い順"
          checked={settings.knowledge.desc}
          onChange={(desc) =>
            onChange({
              ...settings,
              knowledge: { ...settings.knowledge, desc },
            })
          }
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">重要度の重み（-1〜5）</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {weightFields.map(([name, label]) => (
            <SelectField
              key={name}
              id={`weight-${name}`}
              label={label}
              value={String(weights[name])}
              options={weightOptions}
              onChange={(value) =>
                onChange({
                  ...settings,
                  knowledge: {
                    ...settings.knowledge,
                    weights: { ...weights, [name]: Number(value) },
                  },
                })
              }
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}

function ResourceSettings({ settings, onChange }: SettingsSectionProps) {
  return (
    <SettingsSection
      title="リソースの検索条件"
      borderClass="border-l-orange-500"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="resource-user">所有ユーザー</Label>
          <Input
            id="resource-user"
            value={settings.resource.user}
            placeholder="ユーザー名で絞り込み"
            onChange={(event) =>
              onChange({
                ...settings,
                resource: { ...settings.resource, user: event.target.value },
              })
            }
          />
        </div>
        <SelectField
          id="resource-order"
          label="リソースの並び順"
          value={settings.resource.order}
          onChange={(order) =>
            onChange({
              ...settings,
              resource: {
                ...settings.resource,
                order: order as SearchSettings["resource"]["order"],
              },
            })
          }
          options={[
            ["title", "タイトル"],
            ["updated", "更新日時"],
            ["n_char", "文字数"],
            ["n_sentence", "単文数"],
          ]}
        />
      </div>
      <BooleanField
        id="resource-desc"
        label="リソースを降順に並べる"
        checked={settings.resource.desc}
        onChange={(desc) =>
          onChange({
            ...settings,
            resource: { ...settings.resource, desc },
          })
        }
      />
    </SettingsSection>
  );
}

function UserSettings({ settings, onChange }: SettingsSectionProps) {
  return (
    <SettingsSection
      title="ユーザーの検索条件"
      borderClass="border-l-purple-500"
    >
      <SelectField
        id="user-order"
        label="ユーザーの並び順"
        value={settings.user.order}
        onChange={(order) =>
          onChange({
            ...settings,
            user: {
              ...settings.user,
              order: order as SearchSettings["user"]["order"],
            },
          })
        }
        options={[
          ["username", "ユーザー名"],
          ["display_name", "表示名"],
          ["n_resource", "リソース数"],
          ["n_sentence", "単文数"],
          ["n_char", "文字数"],
        ]}
      />
      <BooleanField
        id="user-desc"
        label="ユーザーを降順に並べる"
        checked={settings.user.desc}
        onChange={(desc) =>
          onChange({ ...settings, user: { ...settings.user, desc } })
        }
      />
    </SettingsSection>
  );
}

function SettingsSection({
  title,
  borderClass,
  children,
}: {
  title: string;
  borderClass: string;
  children: ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen
      className={`rounded-md border-l-4 bg-muted/20 ${borderClass}`}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="group h-auto w-full justify-between rounded-none px-3 py-2"
        >
          <span className="font-semibold">{title}</span>
          <ChevronRight className="transition-transform group-data-[state=open]:rotate-90" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

type SettingsSectionProps = {
  settings: SearchSettings;
  onChange: (settings: SearchSettings) => void;
};

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function BooleanField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}
