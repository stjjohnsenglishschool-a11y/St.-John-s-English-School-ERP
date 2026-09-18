import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DollarSign,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Layers,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import {
  fetchCollectionData,
  saveDocument,
  deleteDocument,
  subscribeToCollection,
  resilientUpsert,
  logActivity,
} from "../lib/supabase";
import IncomeHeadUploadModal, {
  OFFICIAL_PRESETS,
  IncomeHeadItem,
} from "./IncomeHeadUploadModal";

const CATEGORIES = [
  "Fee Income",
  "Uniform and Educational Materials",
  "Extra-Curricular Income",
] as const;

interface IncomeHeadsMasterSectionProps {
  setToast: (msg: string) => void;
}

export default function IncomeHeadsMasterSection({
  setToast,
}: IncomeHeadsMasterSectionProps) {
  const [heads, setHeads] = useState<IncomeHeadItem[]>(() => {
    try {
      const cached = localStorage.getItem("sjes_table_income_head_master");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return OFFICIAL_PRESETS;
  });

  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<IncomeHeadItem | null>(null);

  // Form State for Add / Edit modal
  const [formData, setFormData] = useState<IncomeHeadItem>({
    head_category: "Fee Income",
    head_name: "",
    head_code: "",
    default_amount: 0,
    frequency: "Monthly",
    description: "",
    is_active: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data and setup realtime subscription
  useEffect(() => {
    let isMounted = true;

    const loadHeads = async () => {
      setLoading(true);
      try {
        const data = await fetchCollectionData("income_head_master");
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: IncomeHeadItem[] = data.map((d: any) => ({
              head_id: d.id || d.head_id,
              head_category: d.head_category || "Fee Income",
              head_name: d.head_name || "",
              head_code: d.head_code || "",
              default_amount: Number(d.default_amount || 0),
              frequency: d.frequency || "Monthly",
              description: d.description || "",
              is_active: d.is_active !== false,
            }));
            setHeads(mapped);
            localStorage.setItem("sjes_table_income_head_master", JSON.stringify(mapped));
          } else {
            // Seed presets if empty
            await seedPresets(false);
          }
        }
      } catch (err) {
        console.warn("Income heads load note:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHeads();

    const unsubscribe = subscribeToCollection("income_head_master", (newData) => {
      if (Array.isArray(newData) && newData.length > 0) {
        const mapped: IncomeHeadItem[] = newData.map((d: any) => ({
          head_id: d.id || d.head_id,
          head_category: d.head_category || "Fee Income",
          head_name: d.head_name || "",
          head_code: d.head_code || "",
          default_amount: Number(d.default_amount || 0),
          frequency: d.frequency || "Monthly",
          description: d.description || "",
          is_active: d.is_active !== false,
        }));
        setHeads(mapped);
        localStorage.setItem("sjes_table_income_head_master", JSON.stringify(mapped));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const syncLocal = (updated: IncomeHeadItem[]) => {
    setHeads(updated);
    localStorage.setItem("sjes_table_income_head_master", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("income_heads_updated", { detail: updated }));
  };

  const seedPresets = async (showNotification = true) => {
    try {
      setLoading(true);
      await resilientUpsert(
        "income_head_master",
        OFFICIAL_PRESETS.map((p) => ({
          head_category: p.head_category,
          head_name: p.head_name,
          head_code: p.head_code,
          default_amount: p.default_amount,
          frequency: p.frequency,
          description: p.description,
          is_active: p.is_active,
        }))
      );
      syncLocal(OFFICIAL_PRESETS);
      if (showNotification) {
        setToast("Loaded 39 official standard Income Heads successfully!");
      }
    } catch (err: any) {
      console.error("Failed to seed presets:", err);
      syncLocal(OFFICIAL_PRESETS);
      if (showNotification) {
        setToast("Loaded 39 income heads to local workspace.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Open modal for new head
  const handleOpenCreate = () => {
    setEditingHead(null);
    setFormData({
      head_category: selectedCategory !== "All" ? selectedCategory : "Fee Income",
      head_name: "",
      head_code: "",
      default_amount: 0,
      frequency: "Monthly",
      description: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing head
  const handleOpenEdit = (item: IncomeHeadItem) => {
    setEditingHead(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  // Auto-generate head_code when name changes in create mode
  const handleNameChange = (name: string) => {
    const nextCode = formData.head_code
      ? formData.head_code
      : `INC-${formData.head_category.includes("Uniform") ? "MAT" : formData.head_category.includes("Extra") ? "EXT" : "FEE"}-${name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6)}`;

    setFormData((prev) => ({
      ...prev,
      head_name: name,
      head_code: !editingHead && (!prev.head_code || prev.head_code.startsWith("INC-")) ? nextCode : prev.head_code,
    }));
  };

  const handleCategoryChange = (category: string) => {
    const prefix = category.includes("Uniform") ? "MAT" : category.includes("Extra") ? "EXT" : "FEE";
    const rawName = formData.head_name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setFormData((prev) => ({
      ...prev,
      head_category: category,
      head_code: !editingHead ? (rawName ? `INC-${prefix}-${rawName}` : `INC-${prefix}`) : prev.head_code,
    }));
  };

  // Save head (Create or Edit)
  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.head_name.trim()) {
      setToast("Please enter an income head name.");
      return;
    }

    try {
      const code =
        formData.head_code.trim() ||
        `INC-${formData.head_category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const payload = {
        head_category: formData.head_category,
        head_name: formData.head_name.trim(),
        head_code: code,
        default_amount: Number(formData.default_amount || 0),
        frequency: formData.frequency,
        description: formData.description?.trim() || "",
        is_active: formData.is_active,
      };

      if (editingHead?.head_id) {
        await saveDocument("income_head_master", "head_code", {
          id: editingHead.head_id,
          ...payload,
        });

        const updated = heads.map((h) =>
          h.head_id === editingHead.head_id ? { ...h, ...payload } : h
        );
        syncLocal(updated);
        setToast(`Updated "${formData.head_name}" successfully.`);
      } else {
        const saved = await saveDocument("income_head_master", "head_code", payload);
        const newItem: IncomeHeadItem = {
          head_id: (saved as any)?.id || `head-${Date.now()}`,
          ...payload,
        };
        syncLocal([newItem, ...heads]);
        setToast(`Added "${formData.head_name}" to Income Heads.`);
      }

      await logActivity({
        action: `${editingHead ? "Updated" : "Added"} Income Head: ${formData.head_name}`,
        module: "income_head_master",
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save head error:", err);
      // Local fallback
      const fallbackItem: IncomeHeadItem = {
        head_id: editingHead?.head_id || `head-${Date.now()}`,
        ...formData,
      };
      const updated = editingHead
        ? heads.map((h) => (h.head_id === editingHead.head_id ? fallbackItem : h))
        : [fallbackItem, ...heads];
      syncLocal(updated);
      setToast(`Saved "${formData.head_name}" to local master.`);
      setIsModalOpen(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (item: IncomeHeadItem) => {
    const nextStatus = !item.is_active;
    const updated = heads.map((h) =>
      h.head_code === item.head_code || h.head_id === item.head_id
        ? { ...h, is_active: nextStatus }
        : h
    );
    syncLocal(updated);

    try {
      await resilientUpsert("income_head_master", [
        {
          ...(item.head_id ? { id: item.head_id } : {}),
          head_code: item.head_code,
          head_name: item.head_name,
          head_category: item.head_category,
          is_active: nextStatus,
        },
      ]);
      setToast(`${item.head_name} is now ${nextStatus ? "Active" : "Inactive"}.`);
    } catch {
      setToast(`${item.head_name} status updated locally.`);
    }
  };

  // Delete head
  const handleDeleteHead = async (item: IncomeHeadItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.head_name}"?`)) {
      return;
    }

    const updated = heads.filter(
      (h) => h.head_id !== item.head_id && h.head_code !== item.head_code
    );
    syncLocal(updated);

    try {
      if (item.head_id) {
        await deleteDocument("income_head_master", item.head_id);
      }
      setToast(`Deleted "${item.head_name}".`);
    } catch {
      setToast(`Removed "${item.head_name}" locally.`);
    }
  };

  // CSV File Upload Handler
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length === 0) {
        setToast("Uploaded file is empty.");
        return;
      }

      // Check header
      const headerLine = lines[0].toLowerCase();
      const startIndex = headerLine.includes("head") || headerLine.includes("category") || headerLine.includes("name") ? 1 : 0;

      const newItems: IncomeHeadItem[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter handling basic quotes
        const cols: string[] = [];
        let curr = "";
        let inQuotes = false;

        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            cols.push(curr.trim());
            curr = "";
          } else {
            curr += char;
          }
        }
        cols.push(curr.trim());

        if (cols.length === 0 || !cols[0]) continue;

        // Infer fields based on column count and contents:
        // Format A (6 cols): Category, Name, Code, Amount, Frequency, Description
        // Format B (2 cols): Category, Name
        // Format C (1 col): Name (default to Fee Income)
        let category = "Fee Income";
        let name = "";
        let code = "";
        let amount = 0;
        let frequency = "Monthly";
        let description = "";

        if (cols.length >= 6) {
          category = cols[0];
          name = cols[1];
          code = cols[2];
          amount = parseFloat(cols[3]) || 0;
          frequency = cols[4] || "Monthly";
          description = cols[5] || "";
        } else if (cols.length === 5) {
          category = cols[0];
          name = cols[1];
          code = cols[2];
          amount = parseFloat(cols[3]) || 0;
          frequency = cols[4] || "Monthly";
        } else if (cols.length === 4) {
          category = cols[0];
          name = cols[1];
          code = cols[2];
          amount = parseFloat(cols[3]) || 0;
        } else if (cols.length === 3) {
          category = cols[0];
          name = cols[1];
          amount = parseFloat(cols[2]) || 0;
        } else if (cols.length === 2) {
          category = cols[0];
          name = cols[1];
        } else {
          name = cols[0];
        }

        // Normalize category
        const catLower = category.toLowerCase();
        if (catLower.includes("uniform") || catLower.includes("material") || catLower.includes("book")) {
          category = "Uniform and Educational Materials";
        } else if (catLower.includes("extra") || catLower.includes("curricular") || catLower.includes("camp") || catLower.includes("tour")) {
          category = "Extra-Curricular Income";
        } else {
          category = "Fee Income";
        }

        if (!name) continue;

        if (!code) {
          const prefix = category.includes("Uniform") ? "MAT" : category.includes("Extra") ? "EXT" : "FEE";
          code = `INC-${prefix}-${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}`;
        }

        newItems.push({
          head_category: category,
          head_name: name,
          head_code: code,
          default_amount: amount,
          frequency: frequency || "Monthly",
          description: description || name,
          is_active: true,
        });
      }

      if (newItems.length === 0) {
        setToast("No valid income head records found in the CSV.");
        return;
      }

      // Persist to Supabase & localStorage
      await resilientUpsert("income_head_master", newItems);

      // Merge avoiding duplicates by head_name
      const existingNames = new Set(heads.map((h) => h.head_name.toLowerCase()));
      const filteredNew = newItems.filter((i) => !existingNames.has(i.head_name.toLowerCase()));
      const merged = [...filteredNew, ...heads];

      syncLocal(merged);
      setToast(`Successfully imported ${newItems.length} Income Heads!`);
    } catch (err: any) {
      console.error("CSV import error:", err);
      setToast("Failed to parse CSV file. Please check format.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = [
      "Category,Head Name,Head Code,Default Amount,Frequency,Description",
      "Fee Income,Examination Fee,INC-FEE-EXAM,500,As Needed,Term examination & assessment fees",
      "Fee Income,Computer Fee,INC-FEE-COMP,300,Monthly,IT lab usage & practicals",
      "Fee Income,Smart Class Fee,INC-FEE-SMART,250,Monthly,Interactive smart board fee",
      "Uniform and Educational Materials,School Uniform Sales,INC-MAT-UNIF,850,As Needed,Regular school uniform set",
      "Uniform and Educational Materials,Books Sales,INC-MAT-BOOKS,1800,Annual,Annual course syllabus textbooks set",
      "Uniform and Educational Materials,Stationery Sales,INC-MAT-STAT,250,As Needed,Geometry box and essentials",
      "Extra-Curricular Income,Coaching Class Fee,INC-EXT-COACH,1200,Monthly,Remedial coaching classes",
      "Extra-Curricular Income,Music Class Fee,INC-EXT-MUSIC,400,Monthly,Vocal & instrumental music sessions",
      "Extra-Curricular Income,Yoga Class Fee,INC-EXT-YOGA,300,Monthly,Breathing and yoga training",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "income_heads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Income Heads CSV template downloaded.");
  };

  // Filtered Heads
  const filteredHeads = useMemo(() => {
    return heads.filter((head) => {
      const matchCategory =
        selectedCategory === "All" || head.head_category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        head.head_name.toLowerCase().includes(q) ||
        head.head_code.toLowerCase().includes(q) ||
        head.head_category.toLowerCase().includes(q) ||
        (head.description && head.description.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [heads, selectedCategory, searchTerm]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: heads.length,
      "Fee Income": 0,
      "Uniform and Educational Materials": 0,
      "Extra-Curricular Income": 0,
    };
    heads.forEach((h) => {
      if (counts[h.head_category] !== undefined) {
        counts[h.head_category]++;
      }
    });
    return counts;
  }, [heads]);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* Top Action Bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "8px 12px",
            minWidth: "260px",
            flex: "1 1 260px",
          }}
        >
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search heads by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              width: "100%",
              fontSize: "13px",
              color: "#0f172a",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "#64748b",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {/* Hidden File Input for CSV */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv,text/csv"
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload CSV with custom income heads"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Upload size={15} color="#2563eb" />
            Upload CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            title="Download CSV sample format with Fee, Uniform, and Extra-Curricular heads"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Download size={15} color="#059669" />
            Template
          </button>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            title="Bulk paste text or view full uploader"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={15} color="#7c3aed" />
            Paste / Bulk
          </button>

          <button
            type="button"
            onClick={() => seedPresets(true)}
            title="Reload 39 standard official income heads"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} color="#475569" className={loading ? "spin" : ""} />
            Load Presets (39)
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--blue, #2563eb)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
            }}
          >
            <Plus size={16} />
            Add Income Head
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {[
          { key: "All", label: "All Heads" },
          { key: "Fee Income", label: "Fee Income" },
          { key: "Uniform and Educational Materials", label: "Uniform & Materials" },
          { key: "Extra-Curricular Income", label: "Extra-Curricular" },
        ].map((cat) => {
          const isSelected = selectedCategory === cat.key;
          const count = categoryCounts[cat.key] || 0;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: isSelected ? "1.5px solid var(--blue, #2563eb)" : "1px solid #cbd5e1",
                background: isSelected ? "var(--blue, #2563eb)" : "#ffffff",
                color: isSelected ? "#ffffff" : "#334155",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  background: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                  color: isSelected ? "#ffffff" : "#64748b",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Code</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Income Head</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Category</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Default (₹)</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Frequency</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <FolderOpen size={36} color="#94a3b8" />
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#334155" }}>
                        No income heads match your selection
                      </div>
                      <div style={{ fontSize: "12px" }}>
                        Click "Upload CSV" or "Load Presets" to populate the official list.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHeads.map((item, idx) => {
                  const isFee = item.head_category === "Fee Income";
                  const isUniform = item.head_category === "Uniform and Educational Materials";
                  const catBadgeBg = isFee ? "#dbeafe" : isUniform ? "#fef3c7" : "#ede9fe";
                  const catBadgeText = isFee ? "#1d4ed8" : isUniform ? "#b45309" : "#6d28d9";

                  return (
                    <tr
                      key={item.head_code || item.head_id || idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>
                        {item.head_code}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.head_name}</div>
                        {item.description && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: catBadgeBg,
                            color: catBadgeText,
                          }}
                        >
                          {item.head_category}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>
                        ₹{Number(item.default_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>
                        {item.frequency || "Monthly"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Click to toggle status"
                          style={{
                            border: "none",
                            cursor: "pointer",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: item.is_active ? "#dcfce7" : "#fee2e2",
                            color: item.is_active ? "#15803d" : "#b91c1c",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {item.is_active ? <Check size={12} /> : <X size={12} />}
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Income Head"
                            style={{
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#475569",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHead(item)}
                            title="Delete Income Head"
                            style={{
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid #fee2e2",
                              background: "#fff5f5",
                              color: "#dc2626",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Head Modal Dialog */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                {editingHead ? "Edit Income Head" : "Add New Income Head"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveHead} style={{ padding: "20px", display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Category *
                </label>
                <select
                  value={formData.head_category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Head Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Activity Fee, School Uniform Sales"
                  value={formData.head_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Head Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INC-FEE-ACT"
                    value={formData.head_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, head_code: e.target.value.toUpperCase() }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Default Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.default_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, default_amount: Number(e.target.value) || 0 }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="One-time">One-time</option>
                    <option value="As Needed">As Needed</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", paddingTop: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                      style={{ width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                    <span>Active Status</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Optional brief description of this income head"
                  value={formData.description || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                    outline: "none",
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--blue, #2563eb)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {editingHead ? "Save Changes" : "Add Income Head"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Bulk Upload Modal */}
      {isBulkModalOpen && (
        <IncomeHeadUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={(count) => {
            setIsBulkModalOpen(false);
            setToast(`Successfully updated ${count} income heads!`);
          }}
          existingCount={heads.length}
        />
      )}
    </div>
  );
}
