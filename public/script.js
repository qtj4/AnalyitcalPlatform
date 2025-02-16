function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

let timeseriesChart;

function initChart() {
    const ctx = document.getElementById('timeseriesChart').getContext('2d');
    timeseriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Time Series Data',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Time Series Data'
                }
            },
            scales: {
                y: {beginAtZero: false}
            }
        }
    });
}

function setLoading(btnId, spinnerId, textId, isLoading, defaultText) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = document.getElementById(textId);
    if (isLoading) {
        btn.disabled = true;
        text.textContent = 'Loading...';
        spinner.style.display = 'inline-block';
    } else {
        btn.disabled = false;
        text.textContent = defaultText;
        spinner.style.display = 'none';
    }
}

const today = new Date();
const afterFiveDays = new Date(today);
afterFiveDays.setDate(today.getDate() + 5);
document.getElementById('startDate').value = today.toISOString().split('T')[0];
document.getElementById('endDate').value = afterFiveDays.toISOString().split('T')[0];

function validateDates() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    document.getElementById('startDateError').textContent = '';
    document.getElementById('endDateError').textContent = '';

    if (endDate < startDate) {
        document.getElementById('endDateError').textContent = 'End date must be after start date';
        return false;
    }
    const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
        document.getElementById('endDateError').textContent = 'Date range cannot exceed 365 days';
        return false;
    }
    return true;
}async function fetchTimeSeriesData() {
    const field = document.getElementById('field').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
        setLoading('submitBtn', 'loadingSpinner', 'buttonText', true, 'Analyze Data');

        const timeseriesResponse = await fetch(
            `/api/measurements?field=${field}&start_date=${startDate}&end_date=${endDate}`
        );
        const timeseriesData = await timeseriesResponse.json();

        if (!timeseriesResponse.ok) {
            throw new Error(timeseriesData.error || 'Failed to fetch time series data');
        }

        timeseriesChart.data.labels = timeseriesData.map(item =>
            new Date(item.timestamp).toLocaleDateString()
        );
        timeseriesChart.data.datasets[0].data = timeseriesData.map(item => item[field]);
        timeseriesChart.data.datasets[0].label = field;
        timeseriesChart.update();

        const metricsResponse = await fetch(
            `/api/measurements/metrics?field=${field}&startDate=${startDate}&endDate=${endDate}`
        );
        const metrics = await metricsResponse.json();

        if (!metricsResponse.ok) {
            throw new Error(metrics.error || 'Failed to fetch metrics');
        }

        document.getElementById('avgValue').textContent = metrics.avg?.toFixed(2) ?? '-';
        document.getElementById('stdDevValue').textContent = metrics.stdDev?.toFixed(2) ?? '-';
        document.getElementById('minValue').textContent = metrics.min?.toFixed(2) ?? '-';
        document.getElementById('maxValue').textContent = metrics.max?.toFixed(2) ?? '-';

    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching data: ' + error.message);
    } finally {
        setLoading('submitBtn', 'loadingSpinner', 'buttonText', false, 'Analyze Data');
    }
}


document.getElementById('analyticsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateDates()) await fetchTimeSeriesData();
});

async function fetchTextSearch() {
    const query = document.getElementById('searchQuery').value;
    try {
        setLoading('searchBtn', 'searchSpinner', 'searchButtonText', true, 'Search');
        const response = await fetch(`/api/measurements/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        if (!response.ok) throw new Error(results.error || 'Failed to fetch search results');

        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<li>No results found</li>';
        } else {
            results.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${new Date(item.timestamp).toLocaleString()}: ${item.description}`;
                searchResults.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching search results: ' + error.message);
    } finally {
        setLoading('searchBtn', 'searchSpinner', 'searchButtonText', false, 'Search');
    }
}

document.getElementById('textSearchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetchTextSearch();
});

async function fetchGeospatialData() {
    const lat = document.getElementById('latitude').value;
    const lng = document.getElementById('longitude').value;
    const maxDistance = document.getElementById('maxDistance').value;
    try {
        setLoading('geoBtn', 'geoSpinner', 'geoButtonText', true, 'Find Nearby');
        const response = await fetch(`/api/stations/nearby?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}`);
        const results = await response.json();
        if (!response.ok) throw new Error(results.error || 'Failed to fetch geospatial data');

        const geoResults = document.getElementById('geoResults');
        geoResults.innerHTML = '';
        if (results.length === 0) {
            geoResults.innerHTML = '<li>No nearby measurements found</li>';
        } else {
            results.forEach(station => {
                const li = document.createElement('li');
                li.textContent = `${station.name} (${station.code}) — Coordinates: [${station.location.coordinates}]`;
                geoResults.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching geospatial data: ' + error.message);
    } finally {
        setLoading('geoBtn', 'geoSpinner', 'geoButtonText', false, 'Find Nearby');
    }
}

document.getElementById('geospatialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetchGeospatialData();
});

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchTimeSeriesData();
});