import { termsIntro, termsSections } from "@/content/terms";
import LegalPage from "@/components/LegalPage";

export default function TermsOfService() {
	return <LegalPage title="Terms of Service" effectiveDate="12 June 2026" intro={termsIntro} sections={termsSections}/>;
}