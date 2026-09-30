<script setup lang="ts">
const installUrl = 'https://www.icloud.com/shortcuts/30f872e0ee2848cfabe004966c461d1f'
const copyMessage = ref('')

useHead({ title: '安裝 iPhone 分享捷徑 — Froggy Link' })

const copyInstallLink = async () => {
  try {
    await navigator.clipboard.writeText(installUrl)
    copyMessage.value = '已複製安裝連結，可以貼給朋友直接加入捷徑。'
  }
  catch {
    copyMessage.value = '請長按下方安裝連結欄位，選取並複製。'
  }
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-5 py-8 text-base leading-relaxed text-slate-700">
    <NuxtLink to="/" class="inline-flex items-center gap-2 font-semibold text-slate-900">
      <img src="/icons/icon-192.png" alt="" class="h-10 w-10">
      Froggy Link
    </NuxtLink>
    <h1 class="mt-8 text-2xl font-bold text-slate-900">iPhone 分享連結，輕鬆收藏</h1>
    <p class="mt-3">加入已設定好的「分享到 Froggy Link」，就能從 Safari、YouTube、Threads 等 App 的分享選單帶入網址，不必自行編輯捷徑。</p>

    <section class="mt-6 rounded-2xl border border-slate-300 bg-white p-5">
      <h2 class="text-xl font-semibold text-slate-900">1. 加入捷徑</h2>
      <p class="mt-2">用 iPhone 或 iPad 開啟此頁，點下方按鈕，再依「捷徑」App 畫面加入。若在其他 App 內無法開啟，請改用 Safari。</p>
      <a :href="installUrl" class="mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">加入「分享到 Froggy Link」</a>
      <p class="mt-3">捷徑已連接正式網站，安裝後即可使用。</p>
    </section>

    <section class="mt-6 rounded-2xl border border-slate-300 bg-white p-5">
      <h2 class="text-xl font-semibold text-slate-900">2. 分享並儲存</h2>
      <ol class="mt-3 list-decimal space-y-3 pl-5">
        <li>在來源 App 開啟要收藏的內容，點「分享」。如果看到 App 自己的選單，先點「更多」開啟 iOS 分享表單。</li>
        <li>往下找到並點選「分享到 Froggy Link」。捷徑會開啟網站，帶入連結。</li>
        <li>確認網址、選擇標籤，再按「新增」儲存收藏。</li>
      </ol>
      <p class="mt-4">找不到分享動作時，也可以直接在「捷徑」App 執行「分享到 Froggy Link」，依提示貼上完整網址。一次會帶入第一個網址。</p>
      <p class="mt-3 rounded-lg bg-slate-100 p-3">捷徑使用「打開 URL」，會開啟瀏覽器，無法可靠指定已安裝的 PWA。要存進原本的 App：在帶入連結的網頁點「複製網址，到 App 收藏」，回到主畫面開啟 Froggy Link，點「貼上連結」，再按「新增」。瀏覽器與 PWA 的收藏不會自動同步。</p>
    </section>

    <section class="mt-6 rounded-2xl border border-slate-300 bg-white p-5">
      <h2 class="text-xl font-semibold text-slate-900">讓朋友直接套用</h2>
      <p class="mt-2">將這個安裝連結傳給朋友，他們就能加入同一份捷徑，不需要設定網站網址。</p>
      <button type="button" class="mt-4 rounded-xl border border-primary px-5 py-3 font-semibold text-primary hover:bg-slate-50" @click="copyInstallLink">複製安裝連結</button>
      <p v-if="copyMessage" role="status" class="mt-3">{{ copyMessage }}</p>
      <label for="install-link" class="mt-4 block font-medium">捷徑安裝連結</label>
      <input id="install-link" :value="installUrl" readonly class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" @focus="($event.target as HTMLInputElement).select()">
    </section>

    <details class="mt-6 rounded-xl bg-slate-50 p-4">
      <summary class="cursor-pointer font-medium text-slate-900">安裝遇到問題？</summary>
      <p class="mt-3">請確認已安裝 Apple「捷徑」App。若 iCloud 連結暫時無法使用，可以下載已簽署的捷徑檔案，從「檔案」App 開啟並加入。</p>
      <a href="/shortcuts/share-to-froggy-link.shortcut" download="分享到 Froggy Link.shortcut" class="mt-3 inline-block text-primary underline underline-offset-4">下載捷徑檔案</a>
      <p class="mt-3">如果先前曾手動建立同名捷徑，請在分享表單選擇新加入的版本。捷徑只處理你分享或貼上的網址，不會自動讀取剪貼簿，也不會自動儲存收藏。</p>
    </details>
    <NuxtLink to="/" class="mt-6 inline-block text-primary underline underline-offset-4">返回收藏清單</NuxtLink>
  </main>
</template>
