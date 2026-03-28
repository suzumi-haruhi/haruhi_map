<template>
  <div class="community-pane-head">

    <div class="section-title">
      团内信息
    </div>

    <div class="community-head-right">

      <div class="row">
        <slot name="actions"></slot>
      </div>

      <img
        src="@/assets/sos_info.webp"
        class="sos-info"
        alt="info"
      />

    </div>

  </div>
</template>

<style scoped>
.community-pane-head{
  padding:4px 14px 0 14px;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.community-head-right{
  display:flex;
  align-items:center;
  gap:10px;
}

.sos-info{
  height:60px;
  width:auto;
  object-fit:contain;
  cursor:pointer;
}
</style>