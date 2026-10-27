import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/eligibility";

export default function EligibilityCheck() {
    const [patientId, setPatientId] = useState("2");
    const [mode, setMode] = useState("async");
    const [simulateFailure, setSimulateFailure] = useState(false);
    const [simulateProviderFailure, setSimulateProviderFailure] = useState("");
    const [status, setStatus] = useState("");
    const [result, setResult] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function loadAttempts(eligibilityCheckId) {
        const response = await axios.get(
            `${API_URL}/tasks/${eligibilityCheckId}/attempts`
        );
        setAttempts(response.data.attempts || []);
    }

    async function handleCheck(event) {
        event.preventDefault();
        setLoading(true);
        setStatus("");
        setResult(null);
        setAttempts([]);
        setError("");

        try {
            const requestBody = {
                patientId: Number(patientId),
                simulateFailure,
                ...(simulateProviderFailure
                    ? { simulateProviderFailure }
                    : {}),
            };

            const response = await axios.post(
                `${API_URL}/check${mode === "async" ? "?mode=async" : ""}`,
                requestBody
            );

            let eligibilityCheck;

            if (mode === "sync") {
                eligibilityCheck = response.data.eligibilityCheck;
                setResult(eligibilityCheck);
                setStatus(eligibilityCheck.status);
            } else {
                const taskId = response.data.taskId;
                setStatus(response.data.status);

                for (let attempt = 0; attempt < 60; attempt++) {
                    await sleep(1000);
                    const taskResponse = await axios.get(
                        `${API_URL}/tasks/${taskId}`
                    );
                    const task = taskResponse.data;
                    setStatus(task.status);

                    if (task.status === "COMPLETED" || task.status === "FAILED") {
                        setResult(task);
                        eligibilityCheck = task;
                        break;
                    }
                }

                if (!eligibilityCheck) {
                    setError(
                        "The task is taking longer than expected. Check its status again."
                    );
                    return;
                }
            }

            const eligibilityCheckId =
                eligibilityCheck?.id ?? eligibilityCheck?.taskId;

            if (eligibilityCheckId) {
                try {
                    await loadAttempts(eligibilityCheckId);
                } catch (attemptError) {
                    console.error(
                        "Unable to load provider attempt history:",
                        attemptError
                    );
                    setError(
                        "Eligibility result received, but provider attempt history could not be loaded."
                    );
                }
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to complete the eligibility check."
            );
        } finally {
            setLoading(false);
        }
    }

    const normalized = result?.normalizedResponse;
    const benefits = normalized?.benefits;

    return (
        <section style={styles.card}>
            <h2>Insurance Eligibility Check</h2>
            <p>
                Verify a patient's insurance eligibility and view the normalized
                response and provider attempts.
            </p>

            <form onSubmit={handleCheck} style={styles.form}>
                <label>
                    Patient ID
                    <input
                        type="number"
                        min="1"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label>
                    Processing mode
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        style={styles.input}
                    >
                        <option value="async">Asynchronous (polling)</option>
                        <option value="sync">Synchronous</option>
                    </select>
                </label>

                <label style={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={simulateFailure}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            setSimulateFailure(checked);
                            if (checked) setSimulateProviderFailure("");
                        }}
                    />
                    Simulate failure for all providers (testing only)
                </label>

                <label>
                    Provider-specific failure
                    <select
                        value={simulateProviderFailure}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSimulateProviderFailure(value);
                            if (value) setSimulateFailure(false);
                        }}
                        style={styles.input}
                    >
                        <option value="">No provider-specific failure</option>
                        <option value="AVAILITY">Fail AVAILITY</option>
                        <option value="STEDI">Fail STEDI</option>
                    </select>
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    style={styles.button}
                >
                    {loading ? "Processing..." : "Check Eligibility"}
                </button>
            </form>

            {status && (
                <p>
                    <strong>Status:</strong> {status}
                </p>
            )}

            {loading && mode === "async" && (
                <p>Waiting for the background task to finish...</p>
            )}

            {error && <p style={styles.error}>{error}</p>}

            {normalized && (
                <div style={styles.result}>
                    <h3>Eligibility Result</h3>
                    <p>
                        <strong>Eligibility:</strong> {normalized.eligibilityStatus}
                    </p>
                    <p>
                        <strong>Payer:</strong> {normalized.payerName}
                    </p>
                    <p>
                        <strong>Member ID:</strong> {normalized.memberId}
                    </p>
                    <p>
                        <strong>Selected provider:</strong>{" "}
                        {normalized.provider ||
                            normalized.routing?.selectedProvider ||
                            result?.selectedProvider ||
                            "Not available"}
                    </p>

                    {benefits && (
                        <>
                            <h4>Benefits</h4>
                            <p>Copay: ${benefits.copay}</p>
                            <p>Total deductible: ${benefits.deductibleTotal}</p>
                            <p>
                                Remaining deductible: ${benefits.deductibleRemaining}
                            </p>
                            <p>Coinsurance: {benefits.coinsurancePercent}%</p>
                        </>
                    )}
                    <p>Retries: {result.retryCount ?? 0}</p>
                </div>
            )}

            {result?.status === "FAILED" && (
                <p style={styles.error}>
                    Eligibility check failed: {result.errorMessage}
                </p>
            )}

            {result && (
                <div style={styles.result}>
                    <h3>Provider Attempt History</h3>
                    {attempts.length === 0 ? (
                        <p>No provider attempts were recorded.</p>
                    ) : (
                        <>
                            <p>
                                Total attempts: <strong>{attempts.length}</strong>
                            </p>
                            {attempts.map((attempt) => (
                                <div key={attempt.id} style={styles.attempt}>
                                    <p>
                                        <strong>Attempt {attempt.attemptNumber}</strong>
                                    </p>
                                    <p>Provider: {attempt.provider}</p>
                                    <p>
                                        Status:{" "}
                                        <strong
                                            style={
                                                attempt.status === "SUCCEEDED"
                                                    ? styles.success
                                                    : styles.failure
                                            }
                                        >
                                            {attempt.status}
                                        </strong>
                                    </p>
                                    <p>
                                        Duration: {attempt.durationMs ?? "N/A"} ms
                                    </p>
                                    <p>
                                        Retryable: {attempt.retryable ? "Yes" : "No"}
                                    </p>
                                    {attempt.errorMessage && (
                                        <p style={styles.error}>
                                            Error: {attempt.errorMessage}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </section>
    );
}

const styles = {
    card: {
        maxWidth: "600px",
        margin: "24px auto",
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        fontFamily: "Arial, sans-serif",
    },
    form: {
        display: "grid",
        gap: "16px",
        marginTop: "20px",
    },
    input: {
        display: "block",
        boxSizing: "border-box",
        width: "100%",
        padding: "10px",
        marginTop: "6px",
    },
    checkbox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    button: {
        padding: "12px",
        cursor: "pointer",
    },
    result: {
        marginTop: "20px",
        padding: "16px",
        background: "#f5f7fa",
        borderRadius: "8px",
    },
    attempt: {
        marginTop: "12px",
        padding: "12px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fff",
    },
    success: {
        color: "#218838",
    },
    failure: {
        color: "#c62828",
    },
    error: {
        color: "#c62828",
    },
};
