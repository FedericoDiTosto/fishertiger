import { Disclosure, RoleChip } from "./ui.jsx";

export const RECOMMENDATION_LABELS = {
  STRONG_BUY: "Compra",
  BID: "Conviene",
  VALUE_ONLY: "Solo al prezzo giusto",
  PASS: "Lascia andare",
  INELIGIBLE: "Non acquistabile",
};

export const RECOMMENDATION_TONE = {
  STRONG_BUY: "go",
  BID: "go",
  VALUE_ONLY: "warn",
  PASS: "stop",
  INELIGIBLE: "stop",
};

export const recommendationLabel = (advice) =>
  RECOMMENDATION_LABELS[advice?.recommendation] || "Valuta";

export function AdviceDetail({ advice }) {
  if (!advice) return null;
  return (
    <div className="verdict-more">
      <Disclosure summary="Perché" badge={`${advice.reasons.length}`}>
        <ul className="bullets">
          {advice.reasons.slice(0, 4).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </Disclosure>
      <Disclosure
        summary="Attenzione"
        badge={advice.risks.length ? `${advice.risks.length}` : "0"}
      >
        {advice.risks.length ? (
          <ul className="bullets bullets--warn">
            {advice.risks.slice(0, 4).map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        ) : (
          <p className="micro">Nessun rischio specifico rilevato.</p>
        )}
      </Disclosure>
      {advice.alternatives.length ? (
        <Disclosure
          summary="Alternative nello stesso ruolo"
          badge={`${advice.alternatives.length}`}
        >
          <div className="rows">
            {advice.alternatives.map((alternative) => (
              <div className="row" key={alternative.id}>
                <RoleChip role={alternative.role} />
                <span className="row-main">
                  <span className="row-title">{alternative.name}</span>
                  <span className="row-sub">
                    differenza di valore {alternative.valueGap}
                  </span>
                </span>
                <span className="row-value">≈ {alternative.estimatedCost}</span>
              </div>
            ))}
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}
