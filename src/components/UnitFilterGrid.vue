<script setup>
import { ref, computed } from 'vue';
import { statusStyle, formatRupiah, buildWaLink, estimateMonthlyInstallment } from '../lib/format.js';

const props = defineProps({
  units: { type: Array, required: true },
  waNumber: { type: String, default: '' }
});

const MAX_COMPARE = 3;
// Simulasi cicilan compare sengaja di-fix: tenor terpanjang, tanpa DP -
// biar orang lihat skenario "paling ringan per bulan, paling gampang mulai".
const COMPARE_TENOR_YEARS = 20;
const COMPARE_DP_PERCENT = 0;

const filters = ['Semua', 'Available', 'Ready Unit', 'Progress (Ready Stock)', 'Sold'];
const activeFilter = ref('Semua');

const sortOptions = [
  { value: 'default', label: 'Urutan Default' },
  { value: 'price-asc', label: 'Harga Terendah' },
  { value: 'price-desc', label: 'Harga Tertinggi' }
];
const activeSort = ref('default');

const compareIds = ref([]);
const showCompareModal = ref(false);

const filtered = computed(() => {
  let list = activeFilter.value === 'Semua'
    ? props.units
    : props.units.filter(u => u.status === activeFilter.value);

  if (activeSort.value === 'price-asc') {
    list = [...list].sort((a, b) => (a.harga || 0) - (b.harga || 0));
  } else if (activeSort.value === 'price-desc') {
    list = [...list].sort((a, b) => (b.harga || 0) - (a.harga || 0));
  }
  return list;
});

const compareUnits = computed(() =>
  props.units.filter(u => compareIds.value.includes(u.id))
);

function chipLabel(f) {
  return f === 'Semua' ? 'Semua' : statusStyle(f).label;
}

function unitWaLink(unit) {
  return buildWaLink(props.waNumber, `Halo, saya tertarik dengan Tipe ${unit.tipe} (${formatRupiah(unit.harga)}), boleh info lebih lanjut?`);
}

function toggleCompare(unit) {
  const idx = compareIds.value.indexOf(unit.id);
  if (idx !== -1) {
    compareIds.value.splice(idx, 1);
    return;
  }
  if (compareIds.value.length >= MAX_COMPARE) return; // udah penuh, abaikan klik
  compareIds.value.push(unit.id);
}

function isCompareFull(unit) {
  return compareIds.value.length >= MAX_COMPARE && !compareIds.value.includes(unit.id);
}

function clearCompare() {
  compareIds.value = [];
  showCompareModal.value = false;
}

function pricePerM2(unit) {
  if (!unit.harga || !unit.luas_bangunan) return null;
  return Math.round(unit.harga / unit.luas_bangunan);
}

function monthlyFor(unit) {
  return estimateMonthlyInstallment(unit.harga, {
    dpPercent: COMPARE_DP_PERCENT,
    tenorYears: COMPARE_TENOR_YEARS
  });
}
</script>

<template>
  <div class="toolbar">
    <div class="filter-chips" role="group" aria-label="Filter status unit">
      <button
        v-for="f in filters"
        :key="f"
        type="button"
        class="chip"
        :class="{ 'is-active': activeFilter === f }"
        @click="activeFilter = f"
      >
        {{ chipLabel(f) }}
      </button>
    </div>

    <label class="sort-select">
      <span class="sr-only">Urutkan</span>
      <select v-model="activeSort">
        <option v-for="s in sortOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>
  </div>

  <p class="compare-hint">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    Bandingkan antar unit &mdash; pilih sampai {{ MAX_COMPARE }} unit dengan ikon di pojok foto
  </p>

  <div class="units-grid">
    <article v-for="unit in filtered" :key="unit.id" class="unit-card">
      <div class="unit-photo">
        <img
          v-if="unit.coverSrc"
          :src="unit.coverSrc"
          :alt="unit.coverCaption || `Tipe ${unit.tipe}`"
          loading="lazy"
        />
        <div v-else class="unit-photo-placeholder">Foto belum tersedia</div>

        <span class="unit-status" :style="{ '--status-color': statusStyle(unit.status).color }">
          {{ statusStyle(unit.status).label }}
        </span>

        <button
          type="button"
          class="compare-toggle"
          :class="{ 'is-active': compareIds.includes(unit.id) }"
          :disabled="isCompareFull(unit)"
          :aria-label="compareIds.includes(unit.id) ? `Batal bandingkan Tipe ${unit.tipe}` : `Bandingkan Tipe ${unit.tipe}`"
          @click="toggleCompare(unit)"
        >
          <svg v-if="compareIds.includes(unit.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      <div class="unit-body">
        <h3>Tipe {{ unit.tipe }}</h3>
        <p v-if="unit.deskripsi" class="unit-desc">{{ unit.deskripsi }}</p>
        <ul class="unit-specs">
          <li v-if="unit.luas_tanah">LT {{ unit.luas_tanah }} m²</li>
          <li v-if="unit.luas_bangunan">LB {{ unit.luas_bangunan }} m²</li>
          <li v-if="unit.kamar">{{ unit.kamar }} KT</li>
        </ul>
        <div class="unit-footer">
          <span class="unit-price">{{ formatRupiah(unit.harga) }}</span>
          <a
            v-if="waNumber"
            :href="unitWaLink(unit)"
            target="_blank"
            rel="noopener noreferrer"
            class="unit-wa-btn"
          >
            Tanya via WA
          </a>
        </div>
      </div>
    </article>

    <p v-if="filtered.length === 0" class="empty-state">Belum ada unit dengan status ini.</p>
  </div>

  <!-- Bar mengambang: cuma muncul kalau ada minimal 1 unit dipilih -->
  <div v-if="compareIds.length > 0" class="compare-bar">
    <div class="compare-bar-info">
      <strong>{{ compareIds.length }}/{{ MAX_COMPARE }} unit dipilih</strong>
      <span>{{ compareUnits.map(u => `Tipe ${u.tipe}`).join(', ') }}</span>
    </div>
    <div class="compare-bar-actions">
      <button type="button" class="btn-compare" @click="showCompareModal = true">Bandingkan</button>
      <button type="button" class="btn-clear" aria-label="Hapus semua pilihan" @click="clearCompare">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>

  <!-- Modal bandingkan -->
  <div v-if="showCompareModal" class="compare-modal-backdrop" @click.self="showCompareModal = false">
    <div class="compare-modal">
      <div class="compare-modal-header">
        <div>
          <p class="compare-modal-title">Bandingkan Unit</p>
          <p class="compare-modal-note">Simulasi cicilan: tenor 20 tahun, DP Rp0 &mdash; simulasi kasar, bukan penawaran resmi bank.</p>
        </div>
        <button type="button" class="btn-clear" aria-label="Tutup" @click="showCompareModal = false">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="compare-columns">
        <div v-for="unit in compareUnits" :key="unit.id" class="compare-column">
          <img
            v-if="unit.coverSrc"
            :src="unit.coverSrc"
            :alt="`Tipe ${unit.tipe}`"
            class="compare-thumb"
          />
          <div v-else class="compare-thumb compare-thumb-placeholder"></div>

          <h4>Tipe {{ unit.tipe }}</h4>

          <div class="compare-highlight">
            <span>Cicilan/bulan (estimasi)</span>
            <strong>{{ formatRupiah(monthlyFor(unit)) }}</strong>
          </div>

          <table class="compare-table">
            <tbody>
              <tr>
                <td>Harga</td>
                <td>{{ formatRupiah(unit.harga) }}</td>
              </tr>
              <tr v-if="pricePerM2(unit)">
                <td>Harga / m²</td>
                <td>{{ formatRupiah(pricePerM2(unit)) }}</td>
              </tr>
              <tr v-if="unit.luas_tanah">
                <td>Luas Tanah</td>
                <td>{{ unit.luas_tanah }} m²</td>
              </tr>
              <tr v-if="unit.luas_bangunan">
                <td>Luas Bangunan</td>
                <td>{{ unit.luas_bangunan }} m²</td>
              </tr>
              <tr v-if="unit.kamar">
                <td>Kamar Tidur</td>
                <td>{{ unit.kamar }}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>{{ statusStyle(unit.status).label }}</td>
              </tr>
            </tbody>
          </table>

          <a
            v-if="waNumber"
            :href="unitWaLink(unit)"
            target="_blank"
            rel="noopener noreferrer"
            class="compare-wa-btn"
          >
            Tanya Unit Ini
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: var(--space-sm);
}
.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.chip {
  background: var(--color-white);
  border: 1px solid var(--color-paper);
  color: var(--color-navy-soft);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover {
  border-color: var(--color-gold);
}
.chip.is-active {
  background: var(--color-navy);
  border-color: var(--color-navy);
  color: var(--color-white);
}
.sort-select select {
  background: var(--color-white);
  border: 1px solid var(--color-paper);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.85rem;
  color: var(--color-navy);
  cursor: pointer;
}
.compare-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-navy-soft);
  margin-bottom: var(--space-md);
}
.units-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--color-navy-soft);
  padding: var(--space-lg) 0;
}
.unit-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}
.unit-photo {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--color-paper);
}
.unit-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.unit-photo-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--color-navy-soft);
  font-size: 0.85rem;
}
.unit-status {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--status-color);
  color: var(--color-white);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}
.compare-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-navy-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.compare-toggle.is-active {
  background: var(--color-gold);
  color: var(--color-navy);
}
.compare-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.unit-body {
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.unit-body h3 {
  font-size: 1.25rem;
}
.unit-desc {
  font-size: 0.88rem;
  color: var(--color-navy-soft);
  line-height: 1.5;
}
.unit-specs {
  display: flex;
  gap: 12px;
  list-style: none;
  font-size: 0.82rem;
  color: var(--color-navy-soft);
  flex-wrap: wrap;
  padding: 0;
}
.unit-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--color-paper);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.unit-price {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--color-navy);
}
.unit-wa-btn {
  background: #25D366;
  color: var(--color-white);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  white-space: nowrap;
}

/* Bar mengambang - kiri bawah, biar gak numpuk sama tombol WA (kanan bawah) */
.compare-bar {
  position: fixed;
  bottom: calc(var(--space-md) + 64px);
  left: var(--space-md);
  right: var(--space-md);
  max-width: 420px;
  margin-inline: auto;
  background: var(--color-navy);
  color: var(--color-white);
  border-radius: 999px;
  padding: 10px 10px 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: var(--shadow-soft);
  z-index: 54;
}
.compare-bar-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.compare-bar-info strong {
  font-size: 0.85rem;
}
.compare-bar-info span {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compare-bar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.btn-compare {
  background: var(--color-gold);
  color: var(--color-navy);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}
.btn-clear {
  background: rgba(255, 255, 255, 0.15);
  color: var(--color-white);
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* Modal */
.compare-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 33, 61, 0.55);
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
.compare-modal {
  background: var(--color-white);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  overflow-y: auto;
  padding: var(--space-md);
}
.compare-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: var(--space-md);
}
.compare-modal-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--color-navy);
}
.compare-modal-note {
  font-size: 0.78rem;
  color: var(--color-navy-soft);
  margin-top: 4px;
}
.compare-modal .btn-clear {
  background: var(--color-paper);
  color: var(--color-navy);
}
.compare-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
}
.compare-column {
  border: 1px solid var(--color-paper);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.compare-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}
.compare-thumb-placeholder {
  background: var(--color-paper);
}
.compare-column h4 {
  font-size: 1rem;
  color: var(--color-navy);
}
.compare-highlight {
  background: var(--color-gold-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.compare-highlight span {
  font-size: 0.7rem;
  color: var(--color-navy-soft);
}
.compare-highlight strong {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--color-navy);
}
.compare-table {
  width: 100%;
  font-size: 0.8rem;
}
.compare-table td {
  padding: 4px 0;
  border-bottom: 1px solid var(--color-paper);
}
.compare-table td:first-child {
  color: var(--color-navy-soft);
}
.compare-table td:last-child {
  text-align: right;
  font-weight: 600;
  color: var(--color-navy);
}
.compare-wa-btn {
  display: block;
  text-align: center;
  background: #25D366;
  color: var(--color-white);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 10px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  margin-top: auto;
}

@media (min-width: 640px) {
  .compare-bar {
    bottom: var(--space-md);
    left: auto;
    right: 84px;
    max-width: 340px;
  }
  .compare-modal-backdrop {
    align-items: center;
  }
  .compare-modal {
    border-radius: var(--radius-lg);
  }
}
</style>
