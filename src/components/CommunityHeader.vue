<template>
  <div class="community-pane-head">
    <div class="community-head-copy">
      <div class="community-head-kicker">Community</div>
      <div class="section-title community-head-title">团内信息</div>
    </div>

    <div class="community-head-right">
      <div class="row community-head-actions">
        <slot name="actions"></slot>
      </div>

      <div class="community-head-badge">
        <img
          src="@/assets/sos_info.webp"
          class="sos-info"
          alt="info"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-pane-head {
  min-height: 56px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.92) 100%);
}

.community-head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.community-head-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.community-head-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.15;
}

.community-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.community-head-actions {
  gap: 8px;
}

.community-head-actions :deep(.btn) {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
}

.community-head-badge {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(0, 119, 255, 0.08);
  border: 1px solid rgba(0, 119, 255, 0.12);
}

.sos-info {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
}

@media (max-width: 640px) {
  .community-pane-head {
    padding: 8px 10px;
  }

  .community-head-title {
    font-size: 16px;
  }

  .community-head-badge {
    width: 36px;
    height: 36px;
  }

  .sos-info {
    width: 28px;
    height: 28px;
  }
}
</style>
