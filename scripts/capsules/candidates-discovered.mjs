/**
 * Culture subjects found by `discover-culture.mjs`, not chosen by hand.
 *
 * Each is a member of a category the English Wikipedia maintains for this
 * destination's city or state — its cuisine, its festivals, its crafts —
 * whose article is long enough to carry a story and which is not itself a
 * place. Stories are built from these subjects, which is why a destination
 * with eleven culture records could not hold twenty-five stories.
 *
 * This file names pages to read, and asserts nothing about the world.
 *
 * Regenerate with:
 *   node scripts/capsules/discover-culture.mjs
 *   node scripts/capsules/write-culture-additions.mjs
 */
export const DISCOVERED_CULTURE = {
  delhi: {
    festival: ["Lohri", "Phool Walon Ki Sair", "Bharat Rang Mahotsav", "Jahan-e-Khusrau", "Delhi Photo Festival", "World Cultural Festival", "Jashn-e-Rekhta"],
    craft: ["Bif Naked", "Kavita Krishnamurthy", "Sunidhi Chauhan", "Kailash Kher", "Harshdeep Kaur", "Dayanita Singh", "Tulsi Kumar", "Reena Saini Kallat", "Neeti Mohan", "Yo Yo Honey Singh", "Arjuna Harjai", "Jonita Gandhi", "Prakriti Kakar"],
  },
  jaipur: {
    food: ["Thali", "Makki ki roti", "Kulfi", "Bhakri", "Palak paneer", "Jodhpuri", "Kachori", "Kadhi", "Jaipur foot", "Soan papdi", "Panjiri", "Baingan bharta", "Mumbai Central–Jaipur Superfast Express", "Bikaneri bhujia", "Rajasthan International Folk Festival", "Dal", "Dal bati", "Karam Chand Bachhawat", "Jodhpur Assembly constituency", "Kaviraja Muraridan", "Katt bafla", "Maharana of Mewar Charitable Foundation", "Rajputi poshak"],
    festival: ["BOSM", "Rajasthan Film Festival", "Jairangam", "Bundi Utsav"],
    craft: ["Mirabai", "Jagjit Singh", "Pichhwai", "Shreya Ghoshal", "Rajput painting", "Ila Arun", "Pabuji Ki Phad", "Komal Kothari", "Blue pottery of Jaipur", "Architecture of Rajasthan", "Mubarak Begum", "Salma Arastu", "Hemlata (singer)", "Ghagra choli", "Ghulam Mohammed (composer)", "Ghoonghat", "Brij Narayan", "Pagri (turban)", "Art of Rajasthan", "Shekhawati painting", "Shanno Khurana", "Rajnigandha Shekhawat", "Ruma Devi", "Bhanwari Devi (singer)"],
  },
  varanasi: {
    food: ["Bhang", "Roti", "Betel nut chewing", "Korma", "Gulab jamun", "Panipuri", "Laddu", "Peda", "Bhojpuri cuisine", "Chole bhature", "Mughlai cuisine", "Panjiri", "Awadhi cuisine", "Baingan bharta", "Litti (dish)", "Sharbat (drink)"],
    festival: ["Bundeli Utsav", "Dev Deepavali (Varanasi)", "Gorakhpur Mahotsav", "Maghar Mahotsav", "Bundelkhand Literature Festival", "Lalahi Chhath"],
    craft: ["Begum Akhtar", "Kirana gharana", "Wajid Ali Shah", "Tun Tun", "Shama Zaidi", "Shubha Mudgal", "Agra gharana", "Zohra Sehgal", "Hard Kaur", "Sugandha Garg", "Vishal Bhardwaj", "Malini Awasthi", "Kanika Kapoor"],
  },
  agra: {
    food: ["Bhang", "Roti", "Betel nut chewing", "Korma", "Makki ki roti", "Gulab jamun", "Raita", "Panipuri", "Laddu", "Chaat", "Kheer", "Peda", "Bhojpuri cuisine", "Chole bhature", "Panjiri", "Awadhi cuisine", "Baingan bharta", "Litti (dish)", "Sharbat (drink)"],
    festival: ["Bundeli Utsav", "Dev Deepavali (Varanasi)", "Gorakhpur Mahotsav", "Maghar Mahotsav", "Bundelkhand Literature Festival", "Lalahi Chhath"],
    craft: ["Begum Akhtar", "Kirana gharana", "Wajid Ali Shah", "Tun Tun", "Shama Zaidi", "Shubha Mudgal", "Agra gharana", "Zohra Sehgal", "Hard Kaur", "Sugandha Garg", "Vishal Bhardwaj", "Malini Awasthi", "Kanika Kapoor"],
  },
  mumbai: {
    food: ["Dioscorea alata", "Dadasaheb Phalke", "Puran poli", "V. Shantaram", "Prabhat Film Company", "Baburao Painter", "Garcinia indica", "Pune International Film Festival", "Fakt Marathi Cine Sanman", "Zee Chitra Gaurav Puraskar for Best Playback Singer – Male", "Zee Chitra Gaurav Puraskar for Best Playback Singer – Female", "Bhiwapur chilli", "Kolhapur jaggery", "Lasalgaon onion", "Jalgaon banana", "Sangli raisins", "Planet Marathi", "Vengurla cashew", "V. Shantaram Lifetime Achievement Award", "Bombay sandwich", "Chalchitra Mandalee"],
    festival: ["Hindi cinema", "Makar Sankranti", "Naga Panchami", "Yash Raj Films", "Salim–Javed", "Dharma Productions", "Excel Entertainment", "Shemaroo Entertainment", "Vishesh Films", "KASHISH Pride Film Festival", "Balaji Motion Pictures", "Devgn Films", "Phantom Studios", "I F P", "Junglee Pictures", "Varma Films", "Goldmines Telefilms"],
    craft: ["Asha Bhosle", "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", "Farah Khan", "Usha Uthup", "Malaika Arora", "Tun Tun", "Zoya Akhtar", "Sadhana Sargam", "Saroj Khan", "Bhanu Athaiya", "Raageshwari Loomba", "Padmini Kolhapure", "Tulsi Kumar", "Mahalakshmi Iyer"],
  },
  kolkata: {
    festival: ["Pohela Boishakh", "Jagaddhatri", "Sharada Purnima", "Festivals in Kolkata", "Vasant Panchami", "Rathayatra of Mahesh", "Poush Mela", "Barowari", "Asian Paints Sharad Shamman", "Jitiya", "Bandna", "Guptipara Rathayatra", "Karam festival", "Sindur Khela", "Shakta Rash", "Durga Puja in Kolkata", "Durga Puja Carnival", "Durga Puja in West Bengal", "Panihati Chida Dahi Utsav"],
    craft: ["Battle of the Coral Sea", "Philippines campaign (1941–1942)", "Shreya Ghoshal", "Mamata Banerjee", "Invasion of Lingayen Gulf", "Huon Peninsula campaign", "Admiralty Islands campaign", "Debashree Roy", "North Western Area Campaign"],
  },
  hyderabad: {
    food: ["Dosa (food)", "Idli", "Korma", "Upma", "Raita", "Dahi vada", "Kheer", "Papadam", "Nihari", "Puri (food)", "Rasam (dish)", "Dopiaza", "Hyderabadi haleem", "Andhra cuisine", "Karachi Bakery", "Masala dosa", "Vada (food)", "Roat", "Tandur Redgram"],
    festival: ["Ugadi", "Telugu cinema", "IIT Hyderabad", "Hyderabad Literary Festival"],
    craft: ["Bhadrachala Ramadasu", "Chakri (composer)", "Chandrabose (lyricist)", "G. K. Venkatesh", "Mickey J. Meyer", "Vandemataram Srinivas", "Rashid Ali (singer)", "Rukmini Vijayakumar", "Anup Rubens", "Kesava Kiran", "Savitha Sastry", "Spoorthi Yadagiri", "Gifton Elias", "Vivek Sagar", "Kandikonda", "Mangala Bhatt", "Darshanam Mogilaiah", "Gaddam Padmaja Reddy", "Swathi Somnath", "Maddali Usha Gayatri", "Rajeswari Sainath", "Kasarla Shyam"],
  },
  kochi: {
    food: ["Dosa (food)", "Banana chips", "Idli", "Sambar (dish)", "Upma", "Raita", "Kheer", "Papadam", "Puri (food)", "Rasam (dish)", "Idiyappam", "Banana fritter", "Chatti pathiri", "Matta rice", "Cassava-based dishes", "Tapioca chips", "Thalassery cuisine", "Rasam (film)", "Masala dosa", "South Indian parotta", "Vada (food)"],
    festival: ["Pooram", "Ayya Vaikunda Avataram", "Mamankam", "Kalpathi Ratholsavam", "Makara Jyothi", "Pulikali", "Pindikuthi Perunnal", "Thiruvathira", "Naduvil Madhom", "Kerala School Kalolsavam", "Ilanjithara Melam", "Bhogi", "Thirumandhamkunnu Pooram"],
    craft: ["Shobana", "Meera Jasmine", "Bhavana (actress)", "Mappila songs", "Parvathy Thiruvothu", "Architecture of Kerala"],
  },
  goa: {
    food: ["Chorizo", "Samosa", "Feni (liquor)", "Saraswat cuisine", "Kuswar", "Patoleo", "Modak", "Dodol", "Khola chilli", "Harmal chilli", "Goan cashew", "Agsechi Vayingim (Agassaim Brinjal)", "Myndoli Banana"],
    festival: ["International Film Festival of India", "Carnival in Goa", "Goa Arts and Literature Festival", "São João Festival in Goa", "Vasco Saptah", "Dhenlo", "Dhond (Goa)"],
    craft: ["Psychedelic trance", "Goa trance", "Infected Mushroom", "Juno Reactor", "Astrix", "Music of Goa", "Kesarbai Kerkar", "Olli Wisdom", "Martin Freeland", "Mogubai Kurdikar", "Return to the Source", "Varsha Usgaonkar", "Deknni", "Hema Sardesai", "Lorna Cordeiro", "Tiatr", "Prafulla Dahanukar", "Goans in Hindi film music composition", "Santa Cecilia Choir", "Anjanibai Malpekar", "Nachom-ia Kumpasar", "Pascal Kleiman", "Sonia Shirsat", "Esther Eden", "Angela Trindade", "Yolanda de Sousa"],
  },
  amritsar: {
    food: ["Roti", "Butter chicken", "Makki ki roti", "Saag", "Paneer", "Gulab jamun", "Raita", "Harees", "Bhatura", "Kheer", "Puri (food)", "Khoa", "Kadhi", "Dal makhani", "Mughlai cuisine", "Soan papdi", "Rajma", "Baingan bharta", "Sarson ka saag", "Tikka (food)", "Tandoor", "Paneer tikka", "Gajar ka halwa", "Punjabi tandoori cooking"],
    festival: ["Makar Sankranti", "Holi", "Raksha Bandhan", "Qila Raipur Sports Festival", "Saka Sirhind", "Maghi", "Festivals in Lahore", "Punjabi festivals", "Basant (festival)", "Teeyan", "Punjabi festivals (Pakistan)", "Punjabi Culture Day"],
    craft: ["Dhol", "Suraiya", "Deepa Mehta", "Gurdas Maan", "Bansi Chandragupta", "Satish Gujral", "Sarindar Dhaliwal", "Kamaljit Neeru", "Miss Pooja", "Raj Rewal", "Prem Lata Sharma", "Sugandha Mishra", "Ravi Deep", "Radhika Khanna", "Jasleen Royal", "Jasmine Sandlas", "Teji Grover", "Ritu Kumar", "Nitya Mehra"],
  },
  ahmedabad: {
    food: ["Roti", "Thali", "Bhel puri", "Kulfi", "Bombay mix", "Bhakri", "Chaat", "Puri (food)", "Puran poli", "Palak paneer", "Dal bhat", "Kadhi", "Patrode", "Peda", "Basundi", "Murabba", "Panjiri", "Baingan bharta", "Sarson ka saag", "Dal"],
    festival: ["International Kite Festival in Gujarat – Uttarayan", "VadFest", "Dashama Vrata", "Ahmedabad International Film Festival"],
    craft: ["Mallika Sarabhai", "Alisha Chinai", "Garba (dance)", "Dandiya Raas", "Shefali Jariwala", "Kumudini Lakhia", "Demographics and culture of Ahmedabad", "Bilaval", "Kanak Rele", "Mauli Dave", "Homai Vyarawalla", "Shruti Pathak", "Astad Deboo", "Aishwarya Majmudar", "Aditi Mangaldas", "Shanta Gandhi", "Hema Upadhyay", "Dharmesh Yelande", "Sabarmati Marathon", "Gujarati theatre", "Revanta Sarabhai", "Bhoomi Trivedi", "Meghna Patel"],
  },
  lucknow: {
    food: ["Bhang", "Roti", "Betel nut chewing", "Korma", "Gulab jamun", "Raita", "Panipuri", "Laddu", "Chaat", "Kheer", "Peda", "Bhojpuri cuisine", "Chole bhature", "Mughlai cuisine", "Panjiri", "Baingan bharta", "Litti (dish)", "Sharbat (drink)", "Paratha"],
    festival: ["Bundeli Utsav", "Dev Deepavali (Varanasi)", "Gorakhpur Mahotsav", "Maghar Mahotsav", "Bundelkhand Literature Festival", "Lalahi Chhath"],
    craft: ["Begum Akhtar", "Kirana gharana", "Wajid Ali Shah", "Tun Tun", "Shama Zaidi", "Shubha Mudgal", "Agra gharana", "Zohra Sehgal", "Hard Kaur", "Sugandha Garg", "Vishal Bhardwaj", "Malini Awasthi", "Kanika Kapoor"],
  },
  pune: {
    food: ["Dioscorea alata", "Dadasaheb Phalke", "V. Shantaram", "Prabhat Film Company", "Baburao Painter", "Modak", "Garcinia indica", "Pune International Film Festival", "Fakt Marathi Cine Sanman", "Zee Chitra Gaurav Puraskar for Best Playback Singer – Male", "Zee Chitra Gaurav Puraskar for Best Playback Singer – Female", "Bhiwapur chilli", "Kolhapur jaggery", "Lasalgaon onion", "Jalgaon banana", "Sangli raisins", "Planet Marathi", "Vengurla cashew", "V. Shantaram Lifetime Achievement Award", "Bombay sandwich", "Chalchitra Mandalee"],
    festival: ["Ugadi", "Makar Sankranti", "Bhai Dooj", "Vata Purnima", "Naga Panchami", "Sharada Purnima", "Lavani", "Tamasha", "KASHISH Pride Film Festival", "Shrinivas Khale", "Mumbai International Film Festival", "I F P", "Pandharpur Vari"],
    craft: ["Asha Bhosle", "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", "Farah Khan", "Usha Uthup", "Malaika Arora", "Tun Tun", "Zoya Akhtar", "Sadhana Sargam", "Saroj Khan", "Bhanu Athaiya", "Raageshwari Loomba", "Padmini Kolhapure", "Tulsi Kumar", "Mahalakshmi Iyer"],
  },
  mysuru: {
    food: ["Dosa (food)", "Idli", "Sambar (dish)", "Upma", "Kheer", "Papadam", "Rasam (dish)", "Udupi cuisine", "Basundi", "Saraswat cuisine", "Byadagi chilli", "Darshini (restaurant)", "Benne dose", "Vada (food)", "Medu vada", "Household stone implements in Karnataka", "Gulbarga Tur Dal"],
    festival: ["Mahamastakabhisheka", "Pili Yesa", "Dasara elephants", "Gauri Habba", "Hyderabad-Karnataka Liberation Day", "Kodava Hockey Festival", "Madikeri Dasara", "Bangalore Karaga", "Japan Habba", "Bengaluru Namma Pride March", "Narasimha Jayanti", "BLR Hubba"],
    craft: ["Vasundhara Das", "Vyasatirtha", "Haridasa", "Sudha Ragunathan", "Folk arts of Karnataka", "Lata Pada", "V. Harikrishna", "Lakshmi Gopalaswamy", "Nithya Menen", "Puttaraj Gawai", "Parvathamma Rajkumar", "Bangalore Nagarathnamma", "Anuradha Bhat", "Prateeksha Kashi", "Rummana Hussain"],
  },
  madurai: {
    food: ["Ghee", "Dosa (food)", "Mulligatawny", "Macaroon", "Upma", "Dahi vada", "Kheer", "Papadam", "Puri (food)", "Rasam (dish)", "Puran poli", "Idiyappam", "Puttu", "Appam", "Patrode", "Kottu", "Murukku", "Masala dosa", "Congee"],
    festival: ["Mahamaham", "Pongal (festival)", "Karthika Deepam", "Madras Music Season", "Puthandu", "Ayya Vaikunda Avataram", "Golu (festival)", "Thimithi", "Meenakshi Tirukalyanam", "Mattu Pongal", "Thiruvathira", "National Science Film Festival and Competition", "Theppotsavam", "Erwadi Santhanakoodu Festival", "Summer Festival in The Nilgiris", "Brahmotsava", "Bhogi", "Kaveri Pushkaram", "Aravan Festival in Coimbatore", "Indra Vila", "Mayana Kollai", "Narasimha Jayanti", "Vaanam Art Festival", "Nandhi Marriage Festival", "Coimbatore Pride"],
    craft: ["M. S. Subbulakshmi", "D. K. Pattammal", "Rukmini Devi Arundale", "Bhavatharini", "Harini (singer)", "Vyjayanthimala", "Vani Jairam", "M. L. Vasanthakumari", "Andrea Jeremiah", "Shruti Haasan", "Nithyasree Mahadevan", "Shweta Mohan", "Soolamangalam Sisters", "Suchitra", "Anita Ratnam", "Leela Samson", "Architecture of Tamil Nadu"],
  },
  bhubaneswar: {
    food: ["Samosa", "Saag", "Ilish", "Kheer", "Rasgulla", "Puri (food)", "Cuisine of Odisha", "Dal bhat", "Luchi", "Ghugni", "Handia (drink)", "Sattu", "Baingan bharta", "Chhena", "Mutton curry", "Khejurer Gur", "Nayagarh Kanteimundi brinjal"],
    festival: ["Joint Entrance Examination – Advanced", "Ratha Yatra (Puri)", "Jagaddhatri", "Sharada Purnima", "Vasant Panchami", "Festivals of Odisha", "Kali Puja", "Dhanu jatra", "Danda Nata", "Maha Bishuba Sankranti", "Boita Bandana", "Ratha Yatra"],
    craft: ["Odissi", "Damodar Hota", "Arts of Odisha", "Odissi music", "Raghunath Panigrahi", "Mrudanga", "Bhikari Bal", "Gotipua", "Upendra Kumar", "Mahari dance", "Saura painting", "Prem Anand", "Sumeet Samos", "Prahallada Nataka", "Utkal Sangeet Mahavidyalaya", "Mardala", "Gopal Chandra Panda", "Ramhari Das", "Tarini Charan Patra", "Dhaneswar Swain", "Shyamamani Devi", "Singhari Shyamsundar Kar", "Sangita Narayana"],
  },
  srinagar: {
    festival: ["Lohri", "Kashmiri Hindu festivals", "Maghi", "Accession Day (Jammu and Kashmir)", "Verite Film Festival (Kashmir)", "International Film Festival of Jammu & Kashmir"],
    craft: ["Begum Samru", "Malika Pukhraj", "Vibha Saraf"],
  },
};
