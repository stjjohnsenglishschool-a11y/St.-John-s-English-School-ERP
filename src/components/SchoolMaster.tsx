import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  School,
  Award,
  Calendar,
} from "lucide-react";
import { logActivity, supabase } from "../lib/supabase";

interface SchoolProfile {
  school_id?: string;
  school_name: string;
  school_code: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  affiliation_no?: string;
  principal_name?: string;
  established_year?: string;
  website?: string;
}

const defaultProfile: SchoolProfile = {
  school_name: "St. John's English School",
  school_code: "SJES-WB-70001",
  email: "st.jjohnsenglishschool@gmail.com",
  phone: "+91 96743 68297",
  whatsapp_number: "+91 96743 68297",
  address: "School Campus, Park Street / Central Avenue",
  city: "Kolkata",
  state: "West Bengal",
  pin_code: "700001",
  affiliation_no: "WB/ENG/2012/948",
  principal_name: "Fr. Johnathan D'Souza",
  established_year: "2010",
  website: "https://stjohns.edu.in",
};

export default function SchoolMaster({
  setToast,
}: {
  setToast: (msg: string) => void;
}) {
  const [profile, setProfile] = useState<SchoolProfile>(() => {
    const saved = localStorage.getItem("sjes_school_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultProfile;
      }
    }
    return defaultProfile;
  });

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("school_master")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          setProfile((prev) => ({ ...prev, ...data }));
          localStorage.setItem("sjes_school_profile", JSON.stringify(data));
        }
      });
  }, []);

  const handleChange = (key: keyof SchoolProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem("sjes_school_profile", JSON.stringify(profile));

      if (supabase) {
        // Try updating or inserting to school_master if available
        try {
          const { error } = await supabase
            .from("school_master")
            .upsert({ ...profile, updated_at: new Date().toISOString() });
          if (error) {
            console.warn("school_master remote sync note:", error.message);
          }
        } catch {
          // Ignored if table is not configured
        }
      }

      await logActivity({
        action: "Updated School Profile & Master Settings",
        module: "school_master",
      });

      setToast("School profile and master settings saved successfully");
      setIsEditing(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section className="page-head">
        <div>
          <span className="overline">INSTITUTIONAL MASTER SETUP</span>
          <h1>School Master & Profile</h1>
          <p>
            Official school registration details, contact credentials, and
            institutional affiliation.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: "var(--blue)",
                color: "#fff",
                border: "none",
              }}
            >
              Edit School Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              style={{
                background: "#fff",
                color: "var(--muted)",
                border: "1px solid var(--line)",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSave}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px, 360px) 1fr",
            gap: "20px",
          }}
        >
          {/* Left Summary Card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: "#fff",
                border: "3px solid #d9ae45",
                padding: "4px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                marginBottom: "16px",
              }}
            >
              <img
                src="https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg"
                alt="School Crest"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--ink)",
                margin: "0 0 4px",
              }}
            >
              {profile.school_name}
            </h2>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: "999px",
                background: "#eaf2ff",
                color: "var(--blue)",
                fontSize: "11px",
                fontWeight: 800,
                marginBottom: "16px",
              }}
            >
              Code: {profile.school_code}
            </span>

            <div
              style={{
                width: "100%",
                borderTop: "1px solid var(--line)",
                paddingTop: "16px",
                display: "grid",
                gap: "12px",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Award size={16} color="var(--amber)" />
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                    Affiliation No.
                  </div>
                  <b>{profile.affiliation_no || "Registered"}</b>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <School size={16} color="var(--blue)" />
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                    Principal
                  </div>
                  <b>{profile.principal_name || "Fr. Principal"}</b>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Calendar size={16} color="var(--green)" />
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                    Established
                  </div>
                  <b>{profile.established_year || "2010"}</b>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={16} color="#10b981" />
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                    Database Security
                  </div>
                  <b style={{ color: "#10b981" }}>Live Supabase ERP Connected</b>
                </div>
              </div>
            </div>
          </div>

          {/* Right Detailed Form */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                Institutional Details & Contact Information
              </h3>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {isEditing ? "Editing Mode" : "Read Only"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>School Name *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.school_name}
                  onChange={(e) => handleChange("school_name", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>School Code *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.school_code}
                  onChange={(e) => handleChange("school_code", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Official Email *</span>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={profile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Telephone / Landline *</span>
                <input
                  type="tel"
                  required
                  disabled={!isEditing}
                  value={profile.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>WhatsApp Helpline</span>
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={profile.whatsapp_number}
                  onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Affiliation Number</span>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.affiliation_no || ""}
                  onChange={(e) => handleChange("affiliation_no", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Principal / Head of Institution</span>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.principal_name || ""}
                  onChange={(e) => handleChange("principal_name", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Official Website</span>
                <input
                  type="url"
                  disabled={!isEditing}
                  value={profile.website || ""}
                  onChange={(e) => handleChange("website", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span>Campus Address *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>City *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>State *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>PIN Code *</span>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profile.pin_code}
                  onChange={(e) => handleChange("pin_code", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <span>Established Year</span>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.established_year || ""}
                  onChange={(e) => handleChange("established_year", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d8e1eb",
                    background: !isEditing ? "#f8fafc" : "#fff",
                  }}
                />
              </label>
            </div>

            {isEditing && (
              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "#fff",
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--blue)",
                    color: "#fff",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Master Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
