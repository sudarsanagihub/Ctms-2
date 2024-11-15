let session = '';


async function fetchVaultSession() {
    const url = `https://cors-anywhere.herokuapp.com/https://partnersi-prana4life-clinical.veevavault.com/api/v24.2/auth`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                username: `prana.user3@partnersi-prana4life.com`,
                password: `Pr@n@U$er3!`
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API response:", data); // Log the entire response for debugging
        session = data.sessionId;

        if (session) {
            console.log("Session ID fetched:", session);
            sessionStorage.setItem('sessionId', session); // Save session ID in sessionStorage
        } else {
            console.error("Session ID not found.");
        }
    } catch (error) {
        console.error("Failed to fetch session:", error);
    }
}

const queries = [
    {
        object: 'study',
        query: "SELECT id, name__v, tolabel(state__v), tolabel(study_type__v) FROM study__v FIND('{searchTerm}')"
     },
     {
         object: 'study_country',
         query: "SELECT id, name__v, study__vr.name__v FROM study_country__v FIND('{searchTerm}')"
     },
     {
         object: 'site',
         query: "SELECT id, name__v, study__vr.name__v, study_country__vr.name__v FROM site__v FIND('{searchTerm}')"
     },
     {
         object: 'study_personnel',
         query: "SELECT id, name__v,  study__clinr.name__v, study_country__clinr.name__v, site__clinr.name__v FROM study_person__clin FIND('{searchTerm}')"
     },
     {
         object: 'organization',
         query: "SELECT id, name__v, organization__vr.name__v, study__vr.name__v, study_country__vr.name__v, site__v FROM study_organization__v FIND('{searchTerm}')"
     },
     {
         object: 'study_product',
         query: "SELECT id, name__v,  tolabel(lifecycle__v), study__vr.name__v, product__vr.name__v FROM study_product__v FIND('{searchTerm}')"
     },
     {
         object: 'visit_definition',
         query: "SELECT id, name__v, sequence__v, study__vr.name__v FROM visit_def__v FIND('{searchTerm}')"
     },
     {
         object: 'monitoring_events',
         query: "SELECT id, name__v, object_type__vr.name__v, tolabel(state__v), study__ctmsr.name__v, study_country__ctmsr.name__v, site__ctmsr.name__v FROM monitoring_event__ctms FIND('{searchTerm}')"
     }
];
 
async function fetchRecords() {
    const session = sessionStorage.getItem('sessionId'); // Retrieve session ID from sessionStorage
    console.log("Fetching records with session ID:", session);

    const resultsMessage = document.getElementById("resultsMessage");

    if (!session) {
        resultsMessage.textContent = "Session not initialized. Refresh the page to get a session.";
        return;
    }

    const searchTerm = document.getElementById("searchInput").value.trim();
    console.log("Search term entered:", searchTerm);

    if (!searchTerm) {
        resultsMessage.textContent = "Please enter a search term.";
        return;
    }

    const fetchPromises = queries.map(q => {
        const formattedQuery = q.query.replace('{searchTerm}', searchTerm);
        const url = `https://cors-anywhere.herokuapp.com/https://partnersi-prana4life-clinical.veevavault.com/api/v24.2/query?q=${encodeURIComponent(formattedQuery)}`;
        console.log(`Query URL for ${q.object}:`, url);

        return fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${session}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error fetching ${q.object}: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => ({ object: q.object, data: data.data || [] }))
        .catch(error => ({ object: q.object, error: error.message }));
    });

    resultsMessage.textContent = "Searching...";

    try {
        const results = await Promise.all(fetchPromises);
        console.log("Fetched all records:", results);

        document.getElementById("searchContainer").style.display = "block";
        document.getElementById("resultsContainer").style.display = "block";

        displayResults(results);
    } catch (error) {
        console.error("Failed to fetch records:", error);
        resultsMessage.textContent = "Error fetching records: " + error.message;
    }
}

function displayResults(results) {
    const resultsMessage = document.getElementById("resultsMessage");
    resultsMessage.textContent = ""; // Clear any existing messages
    resultsMessage.style.display = "none";

    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = ""; // Clear previous results

    const customHeaders = {
        "name__v": "Name",
       "state__v": "State",
       "study_type__v": "Study Type",
       "study__vr.name__v": "Study Name",
       "study_country__vr.name__v": "Study Country",
       "organization__vr.name__v": "Organization",
       "study__clinr.name__v": "Study Name",
       "site__clinr.name__v": "Site",
       "study_country__vr.name__v": "Study Country",
       "site__v": "Site",
       "sequence__v": "Sequence",
       "object_type__vr.name__v": "Object Type",
       "state__v": "State",
       "study__ctmsr.name__v": "Study Name",
       "study_country__ctmsr.name__v": "Study Country",
       "site__ctmsr.name__v": "Study Site",
       "product__vr.name__v": "Study Product",
       "lifecycle__v": "Lifecycle",
       "study_country__clinr.name__v":"Study Country",
       
      
    };

    results.forEach(result => {
        if (result.error) {
            const errorDiv = document.createElement("div");
            errorDiv.classList.add("error");
            errorDiv.textContent = `Error fetching ${result.object}: ${result.error}`;
            resultsContainer.appendChild(errorDiv);
            return;
        }

        const records = result.data;

        if (records.length > 0) {
            const section = document.createElement("section");
            section.classList.add("results-section");

            const heading = document.createElement("h2");
            heading.textContent = `${capitalizeFirstLetter(result.object.replace('_', ' '))}`;
            section.appendChild(heading);

            const table = document.createElement("table");
            table.classList.add("results-table");

            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");

            Object.keys(records[0]).forEach(key => {
                if (key !== "id") { // Hide 'id' column
                    const th = document.createElement("th");
                    th.textContent = customHeaders[key] || formatHeader(key);
                    headerRow.appendChild(th);
                }
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            records.forEach(record => {
                const row = document.createElement("tr");

                Object.entries(record).forEach(([key, value]) => {
                    if (key !== "id") { // Skip 'id' column
                        const cell = document.createElement("td");

                        if (key === 'name__v' && record.id) {
                            const link = document.createElement("a");
                            link.textContent = value;
                            link.href = `https://partnersi-prana4life-clinical.veevavault.com/ui/#t/0TB000000000K15/${record.id}`;
                            link.target = "_blank";
                            cell.appendChild(link);
                        } else {
                            cell.textContent = value || 'N/A';
                        }

                        row.appendChild(cell);
                    }
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            section.appendChild(table);
            resultsContainer.appendChild(section);
        } else {
            const noRecordsDiv = document.createElement("div");
            noRecordsDiv.classList.add("no-records");
            noRecordsDiv.textContent = `No records found for ${capitalizeFirstLetter(result.object.replace('_', ' '))}.`;
            resultsContainer.appendChild(noRecordsDiv);
        }
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatHeader(header) {
    return header.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

document.addEventListener("DOMContentLoaded", fetchVaultSession);

document.getElementById("searchButton").addEventListener("click", fetchRecords);
