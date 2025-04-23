function go() {
    let html = getData();
    let re = /<script|<style|<link/;

    for (let i = 0; i < 1000; ++i) {
        re.test(html);
    }
}
go();

function getData() {
    return `
            <li  data-id="10e69a54-af56-45a3-aef3-e93c95e9e768">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 0</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 0">
            </li>
            <li  data-id="e6861a08-742b-4db7-9f93-b0301cb73593">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 1</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 1">
            </li>
            <li  data-id="80bbdb8b-ab62-4024-bf9e-af73ac4f9e26">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 2</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 2">
            </li>
            <li  data-id="19540f64-38cd-46af-ade3-7e55d95400f5">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 3</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 3">
            </li>
            <li  data-id="be8ff313-5aa3-4966-84d9-bb93d1f76bb2">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 4</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 4">
            </li>
            <li  data-id="51d11485-e744-4182-bdf4-fa368680fb6a">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 5</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 5">
            </li>
            <li  data-id="3a82a733-42dd-4749-8a5e-61594433069c">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 6</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 6">
            </li>
            <li  data-id="c352a78d-fd1d-4408-981d-2ea5119a3ac5">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 7</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 7">
            </li>
            <li  data-id="7f62b0f5-4b86-4b5c-af84-6c25e7d6cab9">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 8</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 8">
            </li>
            <li  data-id="f0bf362f-bd77-4798-994a-e5059b713f06">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 9</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 9">
            </li>
            <li  data-id="a3bf3cca-b234-4dda-949d-a3bc9d48453b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 10</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 10">
            </li>
            <li  data-id="73ea999a-5a4d-4f72-a0cb-e1cae8dfba0b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 11</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 11">
            </li>
            <li  data-id="1e927600-4997-42b6-880b-012ffd0b9dc0">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 12</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 12">
            </li>
            <li  data-id="888fb871-dd4e-454b-97e0-4239c0321fdb">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 13</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 13">
            </li>
            <li  data-id="2ec9e8fe-846b-41b1-93fc-dc766f52cc9b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 14</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 14">
            </li>
            <li  data-id="6dd8153c-6433-42f3-b306-43f450996a3e">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 15</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 15">
            </li>
            <li  data-id="b67d645b-f848-4853-804f-3f84073d876d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 16</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 16">
            </li>
            <li  data-id="d8102262-3244-42ad-888b-9d4857b52efb">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 17</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 17">
            </li>
            <li  data-id="1bcee6b3-4c53-4e9a-ba3c-6cf13a53c588">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 18</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 18">
            </li>
            <li  data-id="b243a26b-14b3-4738-a7e3-9217576bbf3b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 19</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 19">
            </li>
            <li  data-id="905df603-df38-42c8-95d3-b1b95732bb6a">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 20</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 20">
            </li>
            <li  data-id="b47a097a-8deb-40d0-a977-6c93a0f613eb">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 21</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 21">
            </li>
            <li  data-id="fdcc0a08-55e9-4a09-b2cc-87679a7b11fa">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 22</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 22">
            </li>
            <li  data-id="a6b97c6b-8eda-4ac6-9a5c-0036f1890b25">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 23</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 23">
            </li>
            <li  data-id="8b1df467-cb13-4e85-bcaf-86bc4775148f">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 24</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 24">
            </li>
            <li  data-id="496c6d8f-1d60-47f1-834d-623ea13f2233">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 25</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 25">
            </li>
            <li  data-id="9921346b-6168-404a-b926-0cc4f3cd67fd">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 26</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 26">
            </li>
            <li  data-id="66afa8ab-9347-4d39-8323-55e1de310fac">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 27</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 27">
            </li>
            <li  data-id="3d0515ff-2e18-4221-8199-8f84c9daed40">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 28</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 28">
            </li>
            <li  data-id="43b9a88f-f2c3-4020-aadc-cc720f5ff45d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 29</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 29">
            </li>
            <li  data-id="14024449-3247-43f1-a828-995201dbbbe7">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 30</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 30">
            </li>
            <li  data-id="db69b68e-43ea-4c70-b9c5-35ef1f627549">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 31</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 31">
            </li>
            <li  data-id="b965e52e-57d0-4e64-b8b8-ab9ad94095f8">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 32</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 32">
            </li>
            <li  data-id="c38bbaec-a4df-4f23-87b0-7e5d583f366b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 33</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 33">
            </li>
            <li  data-id="0c874b34-6075-406d-b052-b45e24f17807">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 34</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 34">
            </li>
            <li  data-id="7d6cdffb-990d-47b3-ad56-8887e9cb9565">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 35</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 35">
            </li>
            <li  data-id="f3c173f0-c26a-430b-b8bf-e6fd3d9f2697">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 36</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 36">
            </li>
            <li  data-id="fb7412fa-2136-43ba-8628-b21baa727d32">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 37</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 37">
            </li>
            <li  data-id="d8ecabe3-ab6d-4e59-af6b-f41f59d10d45">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 38</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 38">
            </li>
            <li  data-id="368edb99-bba7-44d1-8847-965ce20bf6b6">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 39</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 39">
            </li>
            <li  data-id="0e3f9ccf-ab3b-4401-a786-5e751d0e0fad">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 40</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 40">
            </li>
            <li  data-id="283d3372-c7d7-4841-adb1-3c8637d66b86">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 41</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 41">
            </li>
            <li  data-id="530f82ab-525a-4885-9209-99231193323d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 42</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 42">
            </li>
            <li  data-id="169c74ff-7711-4c1c-aa15-adee378cc711">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 43</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 43">
            </li>
            <li  data-id="b67ca037-6d53-4526-8a21-e0afd7507e21">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 44</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 44">
            </li>
            <li  data-id="f78c8c70-e696-4ad8-9b53-ebfaf4b4d32a">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 45</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 45">
            </li>
            <li  data-id="ccfab676-7ffd-4ada-b5ce-7d405a03e117">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 46</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 46">
            </li>
            <li  data-id="79291ad5-ba92-443a-9c8c-023169505c92">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 47</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 47">
            </li>
            <li  data-id="c9c6184e-8849-41a7-a0a3-bdc1256bfa0c">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 48</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 48">
            </li>
            <li  data-id="d5d0138a-6a41-4f57-a664-f545c13bd97c">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 49</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 49">
            </li>
            <li  data-id="ef03643f-b271-4fa0-9632-c9b05aca9c7d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 50</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 50">
            </li>
            <li  data-id="c3a5abee-8144-4648-9eb8-5c379f79140a">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 51</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 51">
            </li>
            <li  data-id="08a428e4-4a83-4b1b-a6af-3d4d87c2480e">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 52</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 52">
            </li>
            <li  data-id="339ec83d-c4a9-47ca-9684-c2d5a091d361">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 53</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 53">
            </li>
            <li  data-id="1dcf4d6f-c4d3-41cf-8b71-9282f99c8b02">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 54</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 54">
            </li>
            <li  data-id="4ae26cde-9a84-4036-a29f-764026511cba">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 55</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 55">
            </li>
            <li  data-id="256d13db-2396-4324-800d-fa7d2bc73bbb">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 56</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 56">
            </li>
            <li  data-id="2e581d79-34a0-492e-b731-8ce7cfa7c939">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 57</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 57">
            </li>
            <li  data-id="43569d06-d99b-4785-859c-2bf6ca1aac4f">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 58</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 58">
            </li>
            <li  data-id="99bf4d19-27f5-4af4-862d-25ed25cc48e4">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 59</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 59">
            </li>
            <li  data-id="67db283a-f2fe-4f16-b14a-4e85133092f3">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 60</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 60">
            </li>
            <li  data-id="6f834497-59d0-47c1-bb8d-de5bf9cf8479">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 61</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 61">
            </li>
            <li  data-id="95251242-b1c8-4019-96af-8a1b688665ba">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 62</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 62">
            </li>
            <li  data-id="f976d0d8-9c23-43f1-a699-e43bf0c66dfc">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 63</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 63">
            </li>
            <li  data-id="ca0402ba-e43f-4c76-bdc2-894cf906e529">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 64</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 64">
            </li>
            <li  data-id="92cf3b7c-8c42-4938-ba60-8e8428e890a3">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 65</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 65">
            </li>
            <li  data-id="e8cf29c4-bc93-41eb-863b-84af067d6569">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 66</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 66">
            </li>
            <li  data-id="d9b4d2d1-6b03-446d-973f-ad8d7fd38ccd">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 67</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 67">
            </li>
            <li  data-id="b4ed0003-db16-46fa-9835-a2655462d713">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 68</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 68">
            </li>
            <li  data-id="13260127-e631-4991-8e9e-e06af117c148">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 69</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 69">
            </li>
            <li  data-id="33f82a0a-22c4-492f-9791-178ef66a3e37">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 70</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 70">
            </li>
            <li  data-id="fb6e67d8-b6a9-4db9-9650-f53ad749b63d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 71</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 71">
            </li>
            <li  data-id="7a15eb63-1215-4e84-ad2e-f30628b76e10">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 72</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 72">
            </li>
            <li  data-id="191926d5-f213-4092-a636-61f50c644824">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 73</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 73">
            </li>
            <li  data-id="63175e50-5929-4eef-857a-28826eed4fca">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 74</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 74">
            </li>
            <li  data-id="736d0838-ae37-48e5-a89f-68314ccbd71e">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 75</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 75">
            </li>
            <li  data-id="7416ae83-cb73-4632-967f-453314a1ee7c">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 76</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 76">
            </li>
            <li  data-id="d03c539a-78f8-4817-b3b4-453f5c5659b6">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 77</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 77">
            </li>
            <li  data-id="02def341-6576-4f3e-aa29-39798c73fdc6">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 78</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 78">
            </li>
            <li  data-id="7b0163ac-c9b6-43a1-8bb5-2b4218107e6b">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 79</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 79">
            </li>
            <li  data-id="05c614d1-6586-4165-850a-ace64fec03b4">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 80</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 80">
            </li>
            <li  data-id="d25e89f3-a10c-4af8-b06f-2f7bbe22b10d">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 81</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 81">
            </li>
            <li  data-id="3663e7ef-237e-4957-9b0d-72b5b5e20191">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 82</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 82">
            </li>
            <li  data-id="8748725c-1ec6-4ad1-b580-7873f3e3f467">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 83</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 83">
            </li>
            <li  data-id="0637a106-8862-484d-a912-0f3e348ff27c">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 84</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 84">
            </li>
            <li  data-id="009c9ae7-ec95-4f95-98f0-5207ecbe04d5">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 85</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 85">
            </li>
            <li  data-id="e7e8d88b-d626-43cb-9623-5cf44daa8ee4">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 86</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 86">
            </li>
            <li  data-id="62f6bcd7-df69-4767-b9fd-cf2977bd7344">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 87</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 87">
            </li>
            <li  data-id="1845a69f-1186-4ea0-bf6c-8248441d019f">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 88</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 88">
            </li>
            <li  data-id="141bfcc3-393b-466c-895f-e704d7b328bd">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 89</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 89">
            </li>
            <li  data-id="34ef9860-0ef1-4666-9281-4aed015e5890">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 90</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 90">
            </li>
            <li  data-id="78de1834-02eb-4b2d-93b4-2a55133f0a30">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 91</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 91">
            </li>
            <li  data-id="c0ca737d-1192-440e-9033-6571f56788ca">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 92</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 92">
            </li>
            <li  data-id="1b60aaa9-cf53-4d39-9d36-9b35e28646cc">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 93</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 93">
            </li>
            <li  data-id="b4e4bb97-0aa4-4d52-8766-faa803b9d2d1">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 94</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 94">
            </li>
            <li  data-id="043ea65b-8796-4fff-ae0a-1b1836e67cec">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 95</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 95">
            </li>
            <li  data-id="9138ef1b-b0d9-4917-be27-6ad7ae06b166">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 96</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 96">
            </li>
            <li  data-id="3bcb2898-b0f7-4e88-95f5-21ee2294f2d8">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 97</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 97">
            </li>
            <li  data-id="98d004f1-da61-428a-9405-a5eab7899f5e">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 98</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 98">
            </li>
            <li  data-id="2de8837b-809c-41c4-86ee-996678c6a168">
                <div class="view">
                    <input class="toggle" type="checkbox" >
                    <label>Something to do 99</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="Something to do 99">
            </li>
    `;
}
