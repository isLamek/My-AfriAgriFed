import React from "react";
import { useNavigate } from "react-router-dom";
import "./Prices.css";

import tomatoesImg from "./images/Découvrez combien de pieds de tomate planter par m² pour une récolte optimale.jpg";
import maizeImg from "./images/farm2.jpg";
import poultryImg from "./images/How to Raise Laying Hens - DIY Chicken Feed - Egg Harvesting_.jpg";
import cattleImg from "./images/dash-cattle.jpg";
import vegetablesImg from "./images/farm3.jpg";
import grainsImg from "./images/dash-grains.jpg";
import { t, tv, formatNumber } from "./i18n";

const producePrices = [
  {
    name: "Tomatoes",
    averagePrice: 18.50,
    unit: "per kg",
    image: tomatoesImg,
  },
  {
    name: "Maize",
    averagePrice: 7.20,
    unit: "per kg",
    image: maizeImg,
  },
  {
    name: "Eggs",
    averagePrice: 62.00,
    unit: "per tray",
    image: poultryImg,
  },
  {
    name: "Beef",
    averagePrice: 92.00,
    unit: "per kg",
    image: cattleImg,
  },
  {
    name: "Leafy Vegetables",
    averagePrice: 14.00,
    unit: "per bunch",
    image: vegetablesImg,
  },
  {
    name: "Pearl Millet",
    averagePrice: 9.80,
    unit: "per kg",
    image: grainsImg,
  },
];

export default function Prices() {
  const navigate = useNavigate();

  return (
    <div className="prices-page">
      <header className="prices-header">
        <div>
          <p className="eyebrow">{t("prices.marketAverages")}</p>
          <h1>{t("prices.averageProducePrices")}</h1>
        </div>

        <div className="prices-actions">
          <button onClick={() => navigate(-1)}>{t("common.back")}</button>
          <button className="primary" onClick={() => navigate("/profile")}>
            {t("prices.profile")}
          </button>
        </div>
      </header>

      <main className="prices-grid">
        {producePrices.map((item) => (
          <article className="produce-card" key={item.name}>
            <img src={item.image} alt={tv(item.name)} />
            <div className="produce-content">
              <h2>{tv(item.name)}</h2>
              <p className="price-value">N${formatNumber(item.averagePrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p>{tv(item.unit)}</p>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
