import { useTranslation } from "react-i18next";
import { LABEL_GROUPS, labelGroupId } from "./label-chips";
import "../../assets/css/labels.css";

function activeInGroup(current: string[], groupId: string): string | null {
  const group = LABEL_GROUPS.find((g) => g.id === groupId);
  if (!group) return null;
  const keys = group.labels.map((label) => label.key);
  const found = current.find((key) => keys.includes(key));
  if (found) return found;
  return group.required ? (group.defaultKey ?? null) : null;
}

export function LabelsPicker({
  labels,
  onChange,
}: {
  labels: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();

  const selectGroup = (groupId: string, key: string) => {
    const next = labels.filter((k) => labelGroupId(k) !== groupId);
    if (key) next.push(key);
    onChange(next);
  };

  const toggleMulti = (groupId: string, key: string) => {
    if (!key) {
      onChange(labels.filter((k) => labelGroupId(k) !== groupId));
      return;
    }
    if (labels.includes(key)) onChange(labels.filter((k) => k !== key));
    else onChange([...labels, key]);
  };

  return (
    <div className="lbl-picker">
      {LABEL_GROUPS.map((group) => {
        const activeKey = activeInGroup(labels, group.id) ?? "";
        if (group.exclusive) {
          const activeDef = group.labels.find((label) => label.key === activeKey);
          return (
            <div className="lbl-group" key={group.id}>
              <label className="lbl-group-title">{t(group.i18nKey)}</label>

              <div
                className="lbl-select-wrap"
                style={{ "--lc": activeDef ? activeDef.color : "transparent" } as React.CSSProperties}
              >
                <select
                  className="lbl-select select"
                  value={activeKey}
                  onChange={(event) => selectGroup(group.id, event.target.value)}
                >
                  {!group.required && <option value="">— {t("labels.none")} —</option>}

                  {group.labels.map((label) => (
                    <option value={label.key} key={label.key}>
                      {t(label.i18nKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        }
        const hasAny = labels.some((key) => labelGroupId(key) === group.id);
        return (
          <div className="lbl-group" key={group.id}>
            <label className="lbl-group-title">{t(group.i18nKey)}</label>

            <div className="lbl-group-btns">
              {!group.required && (
                <button
                  type="button"
                  className={`lbl-seg-btn lbl-seg-none${!hasAny ? " active" : ""}`}
                  onClick={() => toggleMulti(group.id, "")}
                >
                  {t("labels.none")}
                </button>
              )}

              {group.labels.map((label) => (
                <button
                  type="button"
                  key={label.key}
                  className={`lbl-seg-btn${labels.includes(label.key) ? " active" : ""}`}
                  style={{ "--lc": label.color } as React.CSSProperties}
                  onClick={() => toggleMulti(group.id, label.key)}
                >
                  {t(label.i18nKey)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
