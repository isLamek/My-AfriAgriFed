import ConsumerDashboard from "./ConsumerDashboard";
import { t } from "./i18n";

export default function FarmerDashboard() {
  return <ConsumerDashboard dashboardTitle={t("farmerDashboard.farmerDashboard")} role="farmer" />;
}
