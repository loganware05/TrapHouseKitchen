# Decisions

Record architectural and process decisions here (ADR style).

## Template

### ADR-XXX: Title

- **Status:** Proposed | Accepted | Superseded | Deprecated
- **Date:**
- **Context:**
- **Decision:**
- **Consequences:**

---

### ADR-001: Stop minting $4 coupons on review approval

- **Status:** Accepted
- **Date:** 2026-08-21
- **Context:** Review approval created a $4 coupon, but customers could not reliably apply coupons to reduce checkout price. Messaging promised a reward that did not work.
- **Decision:** Chef approve/reject remains; **do not** create coupons on approve. Leave existing coupon validate/apply APIs for a later dedicated fix. Soften customer/chef copy accordingly.
- **Consequences:** Existing unused coupons may still show on My Reviews; checkout coupon field still present for legacy codes / future work.
