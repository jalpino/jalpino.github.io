/**
 * Represents a player 
 */
class Player{
  constructor( name, prefs ){
    this.name = name;
    this.benched = false;
    this.prefs = prefs; 
    this.played = {};
  }
}

/**
 * Rookie League contains the functionality to create fielding and batting lineups
 * using the game play rules determined by CMRC
 */
class RookieLeague {
  
  static positions = {
            catcher : null,
            pitcher : null,
            first : null,
            second : null,
            third : null,
            shortstop : null,
            center_field : null,
            center_left_field: null,
            center_right_field: null,
            left_field : null,
            right_field : null,
            bench: []
          };
  
  /**
   * Constructor
   * @param players an array of Player objects that represent the team
   * @param innings the max number of innings
   * @extrafielder  a flag indicating if 9 or 10 players are allowed on the field
   */
  constructor( players, innings, extrafielder){
    this.players = players;
    this.innings = innings;
    this.extrafielder = extrafielder;
  }
  
  createBattingLineup(){
    return this.#shuffle( this.players ) ;
  }
  
  /**
   * Create a field lineup for the game
   * @return  an array of positions
   */
  createFieldLineup(){
    
    // 'lineup' contains one entry per inning. Each entry is an object containing the 
    // positions and one or more (in the case of 'benched') players
    var lineup = [];
    
    for(var inning=1; inning <= this.innings; inning++ ){
      
      // randomize the team
      var team = this.#shuffle(this.players);
      
      // intialize the set of positions for this inning 
      var positions = this.#initPositions(); 
      
      // Pick a pitcher (and remove them from the remaining player list)
      positions.pitcher = this.#pickPitcher( team, inning );
      team = team.filter((p)=> p.name != positions.pitcher.name);

      // Pick the benched players (and remove them from the remaining player list)
      positions.bench = this.#pickBenched( team, inning, this.extrafielder );
      team = team.filter((p)=>!positions.bench.map((b)=>b.name).includes(p.name));
      
      // Assign remaining positions
      this.#pickfieldPositions( positions, team, inning, this.extrafielder);
      
      // add the position selections to the lineup
      lineup.push( positions );
    }
    
    return lineup;
  }
  
  #pickfieldPositions( positions, players, inning, extrafielder ){
    var allfilled = false;
    var remainingpositions = Object.keys(positions).map((k)=> !positions[k] ? k : null).filter((k)=>null != k);
    var remcount = extrafielder ? remainingpositions.length+1 : remainingpositions.length;

    // cull positions if there aren't enough players
    /*for(var x=(remcount-players.length); x >0; x-- ){
      remainingpositions.pop();
    }*/
    
    // pick players for remaining positions
    for( var pos of remainingpositions ){
      
      if( extrafielder && pos == 'center_field' ){ continue;}
      if( !extrafielder && (pos == 'center_left_field' || pos == 'center_right_field') ){ continue; }
      
      // exclude players who are already assigned to a position
      var eligible = players.filter((p)=> ! Object.values(positions).map((s)=> s ? s.name : '').includes(p.name) );
                            //.filter((p)=> p.played[pos] < 2 );
      
      // TODO: Add preferences here
      
      if( ! eligible.length ){
          players.forEach( (p) => p.played[pos] = 0 ); // reset
          eligible = players.filter((p)=> ! Object.values(positions).map((s)=> s ? s.name : null).includes(p.name) )
                            .filter((p)=> !p.played[pos] || p.played[pos] >= 0 );
          
      }
      
      eligible = this.#shuffle(eligible);
      
      var fielder = eligible.pop();
      var count = fielder.played[pos] ? fielder.played[pos] : 0;
      count++; 
      fielder.played[pos] = count;
      console.log(inning +" - "+pos +" - "+ fielder.name +" - "+ fielder.played[pos] );
      positions[pos]  = fielder;
    }
    
  }
  
  /**
   * Given the list of eligible players and the current inning, this method will return it's selection
   * for the pitcher. 
   * @param players the list of players to choose from
   * @param inning  the current inning 
   * @return        the chosen player 
   */
  #pickPitcher( players, inning ){
    var kidpitch = inning > 3;
    
    // exclude players that dont want to pitch
    var eligible = players.filter( (p) => p.prefs['pitcher'] != 0 ); 
    
    // if kid pitch, consider those that strongly prefer to pitch first
    var pref = eligible.filter( (p) => kidpitch ? p.prefs['pitcher'] == 2 : true );
    
    // only keep those that haven't exhausted their innings
    pref = pref.filter((p) => ! p.played['pitcher'] || p.played['pitcher'] < (kidpitch ? 2 : 1) );
    
    // randomize
    pref = this.#shuffle(pref);
    
    // safeguard
    if( ! pref.length ){
      // if in kid pitch, prefer those haven't exhausted their innings
      pref = eligible.filter((p)=>(!p.played['pitcher'] || p.played['pitcher'] < 2));
    }
    
    var pitcher = pref.pop();
    var played = pitcher.played['pitcher'] || 0;
    pitcher.played['pitcher'] = played + 1;//(kidpitch ? 2 : 1);
    
    return pitcher;
  }

  /**
   * Given the list of players, current inning and flag indicating if an extra fielder (i.e. center left and center right) is allowed, 
   * this method will choose the players that will be benched (for the current inning). Note: Players will not be benched more than 
   * once untill all players have taken their rotation. 
   * @param players       the list of players to choose from
   * @param inning        the current inning 
   * @param extrafielder  a flag indicating if extra fielders are allowed
   * @return              an array of the players to be benched
   */
  #pickBenched( players, inning, extrafielder ){
    var fieldcount = extrafielder ? 9 : 8;
    var numToBench = players.length - fieldcount;
    
    // exit early if we have enough players
    if( numToBench <= 0 ){
      return [];
    } 
    
    // exclude players who have already been benched
    var benched = [];
    var eligible = players.filter((p)=>!p.benched);
    
    // safeguard if we need to cycle benching
    if( eligible.length < numToBench ){
      while( eligible.length > 0 ){
        benched.push( eligible.pop() );
      }
      players.forEach( (p) => p.benched=false ); // reset
      eligible = players.filter( (p) => !benched.map((b)=>b.name).includes(p.name) ) ;    
    }

    // randomize the list
    eligible = this.#shuffle(eligible);
    while( benched.length < numToBench ){
      benched.push( eligible.pop() );
    }
    benched.forEach( (p) => p.benched=true);
    return benched;
  }
  
  #randrange( max ){
    return Math.floor(Math.random() * max);
  }
  #shuffle( arr ){
    let curr = arr.length;
    while( curr != 0){
      var randindex = this.#randrange(curr);
      curr--;
      var a = arr[curr];
      var b = arr[randindex];
      arr[curr]=b;
      arr[randindex]=a;
    }
    return arr;
  }
  #initPositions(){
    return JSON.parse(JSON.stringify(RookieLeague.positions));
  }
  
}