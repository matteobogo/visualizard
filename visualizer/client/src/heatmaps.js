import * as d3 from 'd3';

const fetchCSVList = function () {

    return fetch("http://localhost:3000/api/static-analysis/csv/measurements")
        .then(res => {
            if (res.ok) {
                return res.json();
            }
        })
        .catch(err => {
            alert('server unavailable');
        })
};

export function buildHeatMap(
    start_interval,
    end_interval,
    resource_id,
    n_machines = 0,
    period = 300) {

    console.log('Fetching CSV filenames..');
    fetchCSVList().then(filenames => {

        console.log(filenames);

        filenames.forEach(filename => {

            d3.csv()
        })

    });

    console.log('Building HeatMap..');















    //fetchData('/data/resource_usage_5.csv').then(data => console.log('OK'));
}
