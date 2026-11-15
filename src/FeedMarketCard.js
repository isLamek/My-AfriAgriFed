import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, MessageCircle, ShoppingBasket, Tag } from "lucide-react";
import { auth } from "./firebaseConfig";
import { chatWith } from "./chat";
import { maskContactInfo } from "./contactGuard";
import { exampleProducePhoto, fallBackToExample } from "./produceImages";
import { formatRelativeTime } from "./timeFormat";
import { t } from "./i18n";

const money = (n) => `N$${Number(n || 0).toLocaleString("en-NA", { maximumFractionDigits: 2 })}`;

/**
 * A listing or a Demand Board request shown in the Community Feed. It looks
 * deliberately different from a post (label, colour band, no likes or
 * comments) so nobody mistakes a sale for a conversation.
 */
export default function FeedMarketCard({ item, onOpenMarketplace }) {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;
  const d = item.data;
  const sale = item.feedKind === "sale";
  const ownerId = sale ? d.sellerId : d.buyerId;
  const ownerName = (sale ? d.sellerName : d.buyerName) || t("marketCard.aMember");
  const title = maskContactInfo(sale ? d.product : d.title || d.product);
  const mine = ownerId === uid;

  const open = () => (sale ? onOpenMarketplace?.() || navigate("/dashboard", { state: { page: "prices" } }) : navigate("/demand-board"));
  const message = () =>
    chatWith(navigate, { otherId: ownerId, otherName: ownerName, topic: { kind: sale ? "listing" : "demand", id: item.id, title } });

  return (
    <article className={`feed-market-card ${sale ? "sale" : "wanted"}`} aria-label={sale ? t("marketCard.ariaForSale", { title }) : t("marketCard.ariaWanted", { title })}>
      <header className="feed-market-source">
        {sale ? <ShoppingBasket size={14} /> : <Tag size={14} />}
        <span>{sale ? t("marketCard.marketplaceForSale") : t("marketCard.demandBoardWanted")}</span>
        {item.at > 0 && <time>{formatRelativeTime(item.at)}</time>}
      </header>

      <div className="feed-market-body">
        {sale && (
          <div className="feed-market-photo">
            <img src={d.imageUrl || exampleProducePhoto(d.product)} alt="" onError={fallBackToExample(d.product)} />
            {!d.imageUrl && <span>{t("marketCard.examplePhoto")}</span>}
          </div>
        )}
        <div className="feed-market-text">
          <h4>{title}</h4>
          <p className="feed-market-line">
            {sale
              ? `${money(d.price)} / ${d.unit || "kg"}${d.quantity != null ? ` · ${d.quantity} available` : ""}`
              : `${d.quantityNeeded} ${d.unit} needed${d.deadline ? ` by ${d.deadline}` : ""}`}
          </p>
          {!sale && d.notes && <p className="feed-market-notes">{maskContactInfo(d.notes).slice(0, 160)}</p>}
          <p className="feed-market-who">
            {sale ? t("marketCard.soldBy") : t("marketCard.requestedBy")} {mine ? "you" : ownerName}
            {d.location?.label && (
              <span>
                <MapPin size={12} /> {d.location.label}
              </span>
            )}
          </p>
          <div className="feed-market-actions">
            <button type="button" className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={open}>
              {sale ? t("marketCard.viewInMarketplace") : mine ? t("marketCard.seePledges") : t("marketCard.pledgeOnTheDemandBoard")}
            </button>
            {!mine && ownerId && (
              <button type="button" className="aaf-btn aaf-btn-ghost aaf-btn-sm" onClick={message}>
                <MessageCircle size={14} /> {sale ? t("marketCard.messageSeller") : t("marketCard.messageBuyer")}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
