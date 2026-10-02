// Şirkətlərin idarə olunması üçün ortaq modul.
// Firebase-i burada initialize etmirik — hər səhifənin öz `database` obyekti ötürülür.
import {
  get,
  ref,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

// Şirkət silmə hələlik deaktivdir. Aktiv etmək üçün `true` edin.
export const ENABLE_COMPANY_DELETE = false;

// `?company=` parametri olmadıqda istifadə olunan şirkət (köhnə linklər üçün).
export const DEFAULT_COMPANY = "elta";

// Firebase-də şirkətlər siyahısının saxlandığı yer.
export const COMPANIES_PATH = "/companies";

// Kodda sabit olan şirkətlər. Bunlar Firebase-də olmasa da göstərilir və silinə bilməz.
export const BUILTIN_COMPANIES = {
  ccg: {
    key: "ccg",
    name: "Caspian Capital Group",
    logo: "/assets/images/logo/Caspian_Capital_Group_Gold_Qara.png",
    // CCG-nin öz ayrıca səhifələri var
    pageUrl: "/assets/pages/ccg-document/document-page.html",
    builtin: true,
  },
  elta: {
    key: "elta",
    name: "ELTA",
    logo: "/assets/images/logo/elta.png",
    builtin: true,
  },
};

// Bu açarlar Firebase-in kök səviyyəsində başqa məqsədlə istifadə olunur.
const RESERVED_KEYS = ["companies", "tasks", "documents", "task", "users"];

const KEY_PATTERN = /^[a-z0-9_-]+$/;

export const isValidCompanyKey = (key) =>
  typeof key === "string" && KEY_PATTERN.test(key);

// URL-dən cari şirkət açarını oxuyur.
export const getCompanyKey = () => {
  const key = new URLSearchParams(window.location.search).get("company");
  return isValidCompanyKey(key) ? key : DEFAULT_COMPANY;
};

// Şirkətin sənədlərinin Firebase yolu, məs. "/elta/documents".
export const companyDocsPath = (key) => `/${key}/documents`;

// Linkə `company` parametrini əlavə edir.
export const withCompany = (url, key = getCompanyKey()) => {
  const u = new URL(url, window.location.href);
  u.searchParams.set("company", key);
  return u.pathname + u.search + u.hash;
};

export const companyPageUrl = (company) =>
  company.pageUrl ||
  withCompany("/assets/pages/document/document-page.html", company.key);

// Şirkət adından Firebase açarı yaradır: "Nur Holding MMC" -> "nur-holding-mmc".
export const slugifyCompanyName = (name) => {
  const map = {
    ə: "e", ı: "i", ö: "o", ü: "u", ğ: "g", ş: "s", ç: "c",
    Ə: "e", I: "i", İ: "i", Ö: "o", Ü: "u", Ğ: "g", Ş: "s", Ç: "c",
  };
  return name
    .trim()
    .replace(/[əıöüğşçƏIİÖÜĞŞÇ]/g, (ch) => map[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
};

export const isReservedKey = (key) =>
  RESERVED_KEYS.includes(key) || key in BUILTIN_COMPANIES;

// Firebase snapshot dəyərini sabit şirkətlərlə birləşdirir.
export const mergeCompanies = (dbCompanies) => {
  const merged = { ...BUILTIN_COMPANIES };
  for (const key in dbCompanies || {}) {
    if (!isValidCompanyKey(key) || key in BUILTIN_COMPANIES) continue;
    merged[key] = { ...dbCompanies[key], key, builtin: false };
  }
  return Object.values(merged);
};

// Şirkətin göstəriləcək adını qaytarır.
export const loadCompanyName = async (database, key) => {
  if (BUILTIN_COMPANIES[key]) return BUILTIN_COMPANIES[key].name;
  try {
    const snapshot = await get(ref(database, `${COMPANIES_PATH}/${key}/name`));
    return snapshot.exists() ? snapshot.val() : key;
  } catch (error) {
    console.error("Şirkət adı oxunmadı: ", error);
    return key;
  }
};

// Cari səhifədəki daxili sənəd linklərinə `company` parametrini əlavə edir
// və başlıqdakı şirkət adını yeniləyir.
export const applyCompanyToPage = (companyName) => {
  const key = getCompanyKey();
  document
    .querySelectorAll('a[href*="document-"], a[href*="parametr.html"]')
    .forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href.includes("ccg-document") || href.startsWith("javascript"))
        return;
      a.setAttribute("href", withCompany(href, key));
    });

  if (companyName) {
    document.querySelectorAll("[data-company-name]").forEach((el) => {
      el.textContent = companyName;
    });
  }
};
