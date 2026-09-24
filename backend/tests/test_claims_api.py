"""Backend tests for L'Oréal Claims Intelligence Engine (NestJS + Prisma + PG).
Two-step workflow: POST /api/claims (Scientist) -> POST /api/claims/:id/assess (Evaluator)."""
import pytest
import requests

BASE_URL = "https://claims-intelligence-3.preview.emergentagent.com"


@pytest.fixture(scope="session")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ---------- GET /api/claims ----------
class TestListClaims:
    def test_list_returns_array_with_latest_assessment(self, s):
        r = s.get(f"{BASE_URL}/api/claims", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        for c in data:
            assert "id" in c and "productName" in c and "status" in c
            assert "assessments" in c and isinstance(c["assessments"], list)
            assert len(c["assessments"]) <= 1  # latest only

    def test_seeded_revitalift_present_and_assessed(self, s):
        data = s.get(f"{BASE_URL}/api/claims", timeout=15).json()
        rev = [c for c in data if "Revitalift Pro-Retinol Serum 1.0" in c["productName"]]
        assert rev, "Seeded Revitalift 1.0 missing"
        assert rev[0]["status"] == "ASSESSED"
        a = rev[0]["assessments"][0]
        assert a["justified"] is True
        assert 0.85 <= a["confidence"] <= 1.0

    def test_seeded_hydra_awaiting_evaluation(self, s):
        data = s.get(f"{BASE_URL}/api/claims", timeout=15).json()
        hydra = [c for c in data if "Hydra Genius" in c["productName"]]
        assert hydra, "Seeded Hydra Genius missing"
        assert hydra[0]["status"] == "FORMULATION_TESTING"


# ---------- GET /api/claims/:id ----------
class TestGetClaim:
    def test_get_by_id_returns_full_assessments(self, s):
        listing = s.get(f"{BASE_URL}/api/claims", timeout=15).json()
        cid = listing[0]["id"]
        r = s.get(f"{BASE_URL}/api/claims/{cid}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == cid
        assert isinstance(body["assessments"], list)

    def test_invalid_uuid_returns_400(self, s):
        r = s.get(f"{BASE_URL}/api/claims/not-a-uuid", timeout=15)
        assert r.status_code == 400

    def test_unknown_uuid_returns_404(self, s):
        r = s.get(f"{BASE_URL}/api/claims/00000000-0000-0000-0000-000000000000", timeout=15)
        assert r.status_code == 404


# ---------- POST /api/claims (Scientist) ----------
def _claim_payload():
    return {
        "productName": "TEST_Vitamin C Serum",
        "claimText": "Reduces dark spots visibly in 4 weeks",
        "claimType": "BRIGHTENING",
        "formula": "Aqua, Ascorbic Acid 10%, Ferulic Acid 0.5%, Tocopherol 1%",
        "submittedBy": "TEST_R&I Scientist",
    }


def _evidence_payload():
    return {
        "studyTitle": "Randomized double-blind 8-week trial",
        "methodology": "Randomized, double-blind, vehicle-controlled trial; N=80; chromameter measurements at weeks 0/4/8",
        "resultsSummary": "Statistically significant (p<0.01) 32% reduction in ITA index vs vehicle at week 4; persisted at week 8.",
        "sampleSize": 80,
        "durationWeeks": 8,
    }


class TestCreateClaim:
    def test_create_claim_sets_formulation_testing(self, s):
        r = s.post(f"{BASE_URL}/api/claims", json=_claim_payload(), timeout=20)
        assert r.status_code in (200, 201), f"got {r.status_code}: {r.text[:300]}"
        body = r.json()
        assert body["status"] == "FORMULATION_TESTING"
        assert body["claimType"] == "BRIGHTENING"
        assert "id" in body

    def test_missing_product_name_returns_400(self, s):
        p = _claim_payload()
        p.pop("productName")
        r = s.post(f"{BASE_URL}/api/claims", json=p, timeout=20)
        assert r.status_code == 400

    def test_bad_claim_type_returns_400(self, s):
        p = _claim_payload()
        p["claimType"] = "NOT_A_TYPE"
        r = s.post(f"{BASE_URL}/api/claims", json=p, timeout=20)
        assert r.status_code == 400

    def test_empty_claim_text_returns_400(self, s):
        p = _claim_payload()
        p["claimText"] = ""
        r = s.post(f"{BASE_URL}/api/claims", json=p, timeout=20)
        assert r.status_code == 400


# ---------- POST /api/claims/:id/assess (Evaluator) ----------
class TestAssessValidation:
    def test_assess_invalid_uuid_returns_400(self, s):
        r = s.post(f"{BASE_URL}/api/claims/not-a-uuid/assess", json=_evidence_payload(), timeout=20)
        assert r.status_code == 400

    def test_assess_unknown_claim_returns_404(self, s):
        r = s.post(
            f"{BASE_URL}/api/claims/00000000-0000-0000-0000-000000000000/assess",
            json=_evidence_payload(),
            timeout=20,
        )
        assert r.status_code == 404

    def test_assess_assessed_claim_returns_409(self, s):
        listing = s.get(f"{BASE_URL}/api/claims", timeout=15).json()
        assessed = [c for c in listing if c["status"] == "ASSESSED"]
        assert assessed, "need at least one ASSESSED claim"
        r = s.post(f"{BASE_URL}/api/claims/{assessed[0]['id']}/assess", json=_evidence_payload(), timeout=20)
        assert r.status_code == 409

    def test_missing_study_title_returns_400(self, s):
        claim = s.post(f"{BASE_URL}/api/claims", json=_claim_payload(), timeout=20).json()
        e = _evidence_payload()
        e.pop("studyTitle")
        r = s.post(f"{BASE_URL}/api/claims/{claim['id']}/assess", json=e, timeout=20)
        assert r.status_code == 400

    def test_sample_size_zero_returns_400(self, s):
        claim = s.post(f"{BASE_URL}/api/claims", json=_claim_payload(), timeout=20).json()
        e = _evidence_payload()
        e["sampleSize"] = 0
        r = s.post(f"{BASE_URL}/api/claims/{claim['id']}/assess", json=e, timeout=20)
        assert r.status_code == 400


class TestAssessHappy:
    def test_two_step_flow_persists_verdict(self, s):
        # Step 1: Scientist creates the claim
        claim = s.post(f"{BASE_URL}/api/claims", json=_claim_payload(), timeout=20).json()
        assert claim["status"] == "FORMULATION_TESTING"

        # Step 2: Evaluator attaches evidence -> LLM assessment
        r = s.post(f"{BASE_URL}/api/claims/{claim['id']}/assess", json=_evidence_payload(), timeout=90)
        assert r.status_code in (200, 201), f"got {r.status_code}: {r.text[:300]}"
        body = r.json()
        assert body["claim"]["id"] == claim["id"]
        assert body["claim"]["status"] == "ASSESSED"
        a = body["assessment"]
        assert a["claimId"] == claim["id"]
        assert isinstance(a["justified"], bool)
        assert 0.0 <= a["confidence"] <= 1.0
        assert isinstance(a["reasoning"], str) and len(a["reasoning"]) > 0
        assert a["model"] == "gpt-5.4"
        assert a["studyTitle"] == _evidence_payload()["studyTitle"]

        # Verify persistence via GET :id
        got = s.get(f"{BASE_URL}/api/claims/{claim['id']}", timeout=15).json()
        assert got["status"] == "ASSESSED"
        assert len(got["assessments"]) == 1

    def test_weak_study_informational(self, s):
        """Weak study should typically yield justified=false. Informational only."""
        p = _claim_payload()
        p["productName"] = "TEST_Weak Study Product"
        p["claimText"] = "Reduces wrinkles by 20% in 2 weeks"
        p["claimType"] = "ANTI_AGING"
        claim = s.post(f"{BASE_URL}/api/claims", json=p, timeout=20).json()
        e = {
            "studyTitle": "Small self-assessment pilot",
            "methodology": "Open-label, no control, N=8, self-assessment questionnaire only, 2 weeks",
            "resultsSummary": "Subjects self-reported ~10% improvement on average; no instrumental measurements; no statistics.",
            "sampleSize": 8,
            "durationWeeks": 2,
        }
        r = s.post(f"{BASE_URL}/api/claims/{claim['id']}/assess", json=e, timeout=90)
        assert r.status_code in (200, 201)
        a = r.json()["assessment"]
        print(f"[informational] weak-study verdict: justified={a['justified']} conf={a['confidence']}")
