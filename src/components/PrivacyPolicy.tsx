import { privacyIntro, privacySections } from "@/content/privacy";
import LegalPage from "@/components/LegalPage";

export default function PrivacyPolicy() {
	return <LegalPage title="Privacy Policy" effectiveDate="12 June 2026" intro={privacyIntro} sections={privacySections}/>;
}