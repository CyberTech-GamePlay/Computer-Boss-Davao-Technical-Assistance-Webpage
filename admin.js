(() => {
    const SUPABASE_URL = "";
    const SUPABASE_ANON_KEY = "";
    const STORAGE_BUCKET = "tutorial-videos";

    const app = window.tutorialApp;
    const loginDialog = document.querySelector("#login-dialog");
    const adminDialog = document.querySelector("#admin-dialog");
    const editorDialog = document.querySelector("#editor-dialog");
    const loginForm = document.querySelector("#login-form");
    const tutorialForm = document.querySelector("#tutorial-form");
    const brandButton = document.querySelector("#brand-admin-button");
    const adminList = document.querySelector("#admin-list");
    const adminNotice = document.querySelector("#admin-notice");
    const editorId = document.querySelector("#tutorial-id");
    const titleInput = document.querySelector("#tutorial-title");
    const descriptionInput = document.querySelector("#tutorial-description");
    const categoryInput = document.querySelector("#tutorial-category");
    const urlInput = document.querySelector("#tutorial-url");
    const fileInput = document.querySelector("#tutorial-file");
    const saveButton = document.querySelector("#save-tutorial-button");
    let client = null;
    let adminUser = null;
    const hasConnectionSettings = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

    const artworkByCategory = {
        "Personal Computer": ["▦", "linear-gradient(135deg,#34452f,#1d2822)"],
        Pisonet: ["₱", "linear-gradient(135deg,#354850,#202b32)"],
        Laptop: ["▰", "linear-gradient(135deg,#3b4930,#242b1d)"],
        Others: ["◇", "linear-gradient(135deg,#4d3e31,#30241e)"]
    };

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        })[character]);
    }

    function setAdmin(user) {
        adminUser = user;
        app.setAdmin(Boolean(user));
        brandButton.setAttribute("aria-label", user
            ? "Open the Computer Boss tutorial manager"
            : "Sign in to the Computer Boss tutorial manager");
        brandButton.title = user ? "Manage tutorials" : "Admin sign in";
        document.querySelector("#admin-account").textContent = user ? `Signed in as ${user.email}` : "";
    }

    function openAdmin() {
        renderAdminList();
        if (!adminDialog.open) adminDialog.showModal();
    }

    function openLogin() {
        if (!client) {
            app.showToast(hasConnectionSettings
                ? "Supabase is not ready. Check the client connection and reload the page."
                : "Add your Supabase project URL and public anon key in admin.js to enable admin login.");
            return;
        }
        if (adminUser) openAdmin();
        else loginDialog.showModal();
    }

    async function verifyAdmin(user) {
        const { data, error } = await client
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            await client.auth.signOut();
            setAdmin(null);
            app.showToast(`Could not verify admin access: ${error.message}`);
            return false;
        }

        if (!data) {
            await client.auth.signOut();
            setAdmin(null);
            app.showToast("This Supabase account is not listed as a Computer Boss admin.");
            return false;
        }

        setAdmin(user);
        return true;
    }

    async function loadTutorials() {
        if (!client) return true;

        const { data, error } = await client
            .from("tutorials")
            .select("id, title, description, category, video_url")
            .order("created_at", { ascending: false });

        if (error) {
            app.setTutorials([]);
            adminNotice.textContent = `Unable to load tutorials: ${error.message}`;
            adminNotice.classList.add("admin-error");
            app.showToast(`Unable to load tutorials from Supabase: ${error.message}`);
            return false;
        }

        adminNotice.textContent = "";
        adminNotice.classList.remove("admin-error");
        app.setTutorials(data.map(tutorial => {
            const [symbol, color] = artworkByCategory[tutorial.category] || artworkByCategory.Others;
            return {
                id: tutorial.id,
                title: tutorial.title,
                description: tutorial.description,
                category: tutorial.category,
                videoUrl: tutorial.video_url || "",
                symbol,
                color
            };
        }));
        renderAdminList();
        return true;
    }

    function renderAdminList() {
        if (!adminUser) return;
        const tutorials = app.getTutorials();
        adminList.innerHTML = tutorials.length
            ? tutorials.map(tutorial => `
                <div class="admin-list-item">
                    <div class="admin-list-copy">
                        <p class="admin-list-title">${escapeHtml(tutorial.title)}</p>
                        <p class="admin-list-meta">${escapeHtml(tutorial.category)}</p>
                    </div>
                    <button class="admin-secondary" type="button" data-edit-tutorial="${escapeHtml(tutorial.id)}">Edit</button>
                </div>
            `).join("")
            : '<p class="admin-notice">No tutorials yet. Add your first video tutorial.</p>';
    }

    function managedVideoPath(videoUrl) {
        try {
            const bucketUrl = new URL(`/storage/v1/object/public/${STORAGE_BUCKET}/`, SUPABASE_URL);
            const video = new URL(videoUrl);
            if (video.origin !== bucketUrl.origin || !video.pathname.startsWith(bucketUrl.pathname)) return "";
            return decodeURIComponent(video.pathname.slice(bucketUrl.pathname.length));
        } catch {
            return "";
        }
    }

    function openEditor(tutorial) {
        tutorialForm.reset();
        editorId.value = tutorial?.id || "";
        titleInput.value = tutorial?.title || "";
        descriptionInput.value = tutorial?.description || "";
        categoryInput.value = tutorial?.category || "Personal Computer";
        urlInput.value = tutorial?.videoUrl || "";
        document.querySelector("#editor-title").textContent = tutorial ? "Edit tutorial" : "Add a tutorial";
        saveButton.textContent = tutorial ? "Save changes" : "Save tutorial";
        editorDialog.showModal();
        titleInput.focus();
    }

    async function saveTutorial(event) {
        event.preventDefault();
        if (!adminUser || !client) {
            app.showToast("Sign in with an authorized Supabase admin account to save tutorials.");
            return;
        }

        const selectedFile = fileInput.files[0];
        if (selectedFile && !selectedFile.type.startsWith("video/")) {
            app.showToast("Choose a video file to upload.");
            return;
        }

        const tutorialId = editorId.value;
        const currentTutorial = app.getTutorials().find(tutorial => tutorial.id === tutorialId);
        let videoUrl = urlInput.value.trim();
        if (!videoUrl && currentTutorial) videoUrl = currentTutorial.videoUrl;
        if (!videoUrl && !selectedFile) {
            app.showToast("Add a video source link or choose a video file to upload.");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = selectedFile ? "Uploading..." : "Saving...";
        let uploadedPath = "";

        try {
            if (selectedFile) {
                const extension = selectedFile.name.includes(".")
                    ? selectedFile.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                    : "";
                const fileId = window.crypto?.randomUUID
                    ? window.crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                uploadedPath = `${fileId}${extension ? `.${extension}` : ""}`;
                const uploadOptions = { cacheControl: "3600", upsert: false };
                if (selectedFile.type) uploadOptions.contentType = selectedFile.type;

                const { error: uploadError } = await client.storage
                    .from(STORAGE_BUCKET)
                    .upload(uploadedPath, selectedFile, uploadOptions);

                if (uploadError) throw new Error(`Video upload failed: ${uploadError.message}`);
                videoUrl = client.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
            }

            const record = {
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                category: categoryInput.value,
                video_url: videoUrl
            };
            const result = tutorialId
                ? await client.from("tutorials").update(record).eq("id", tutorialId).select("id").maybeSingle()
                : await client.from("tutorials").insert(record).select("id").single();

            if (result.error) {
                if (uploadedPath) {
                    const { error: cleanupError } = await client.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
                    if (cleanupError) {
                        throw new Error(`${result.error.message}. The uploaded file could not be cleaned up: ${cleanupError.message}`);
                    }
                }
                throw new Error(result.error.message);
            }
            if (tutorialId && !result.data) {
                if (uploadedPath) {
                    const { error: cleanupError } = await client.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
                    if (cleanupError) {
                        throw new Error(`The tutorial was not updated, and the uploaded file could not be removed: ${cleanupError.message}`);
                    }
                }
                throw new Error("The tutorial was not found or could not be updated.");
            }

            let cleanupWarning = "";
            const previousPath = currentTutorial && currentTutorial.videoUrl !== videoUrl
                ? managedVideoPath(currentTutorial.videoUrl)
                : "";
            if (previousPath) {
                const { error: cleanupError } = await client.storage.from(STORAGE_BUCKET).remove([previousPath]);
                if (cleanupError) cleanupWarning = `Tutorial saved, but the previous uploaded video could not be removed: ${cleanupError.message}`;
            }

            const refreshed = await loadTutorials();
            editorDialog.close();
            renderAdminList();
            app.showToast(refreshed ? (cleanupWarning || "Tutorial saved.") : "Tutorial saved, but the list could not be refreshed.");
        } catch (error) {
            app.showToast(`Could not save tutorial: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = tutorialId ? "Save changes" : "Save tutorial";
        }
    }

    async function signOut() {
        if (!client) return;
        const { error } = await client.auth.signOut();
        if (error) {
            app.showToast(`Could not sign out: ${error.message}`);
            return;
        }
        setAdmin(null);
        adminDialog.close();
        app.showToast("You have been signed out.");
    }

    async function initialize() {
        if (!SUPABASE_URL && !SUPABASE_ANON_KEY) return;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            app.showToast("Set both the Supabase project URL and public anon key in admin.js.");
            return;
        }

        try {
            if (!window.supabase?.createClient) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
                    script.onload = resolve;
                    script.onerror = () => reject(new Error("The Supabase library could not load. Check your internet connection."));
                    document.head.append(script);
                });
            }
            if (!window.supabase?.createClient) throw new Error("The Supabase client is unavailable after loading.");
        } catch (error) {
            app.showToast(error.message);
            return;
        }

        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await client.auth.getSession();
        if (error) app.showToast(`Could not restore the Supabase session: ${error.message}`);
        await loadTutorials();
        if (data?.session?.user) await verifyAdmin(data.session.user);
        client.auth.onAuthStateChange(event => {
            if (event === "SIGNED_OUT") setAdmin(null);
        });
    }

    brandButton.addEventListener("click", openLogin);
    document.querySelectorAll("[data-close-dialog]").forEach(button => {
        button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`).close());
    });

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!client) return openLogin();

        const submitButton = document.querySelector("#login-submit");
        submitButton.disabled = true;
        try {
            const { data, error } = await client.auth.signInWithPassword({
                email: document.querySelector("#login-email").value.trim(),
                password: document.querySelector("#login-password").value
            });
            if (error) throw new Error(error.message);
            document.querySelector("#login-password").value = "";
            if (!await verifyAdmin(data.user)) return;

            loginDialog.close();
            openAdmin();
        } catch (error) {
            app.showToast(`Sign-in failed: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    });

    document.querySelector("#add-tutorial-button").addEventListener("click", () => openEditor(null));
    document.querySelector("#logout-button").addEventListener("click", signOut);
    tutorialForm.addEventListener("submit", saveTutorial);

    adminList.addEventListener("click", event => {
        const button = event.target.closest("[data-edit-tutorial]");
        if (!button) return;
        const tutorial = app.getTutorials().find(item => item.id === button.dataset.editTutorial);
        if (tutorial) openEditor(tutorial);
    });

    document.querySelector("#video-grid").addEventListener("click", event => {
        const button = event.target.closest("[data-edit-video]");
        if (!button) return;
        const tutorial = app.getTutorials().find(item => item.id === button.dataset.editVideo);
        if (tutorial) openEditor(tutorial);
    });

    initialize();
})();
